import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { CliError } from "../lib/errors.ts";
import { toPosixPath } from "../lib/paths.ts";
import { findSkillFiles, loadJsonFile, toRepoRelative } from "../skill/skill-io.ts";
import { generateSkillIndexJson } from "../skill/skill-index.ts";
import { SkillDoc, validateSchema, runCrossChecks } from "../skill/skill-validate.ts";
import { generateSkillInventoryMarkdown } from "../skill/skill-inventory.ts";
import { runInventoryChecks } from "../skill/skill-inventory-checks.ts";
import { scanUnicodeSafety } from "../unicode/unicode-safety.ts";

type CommandContext = {
  rootDir: string;
};

type CheckIssue = {
  check: string;
  message: string;
  file?: string;
};

export async function runCheckAsync(ctx: CommandContext, argv: string[]): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const options = parseArgs(argv);

  const root = ctx.rootDir;
  if (!existsSync(root)) {
    throw new CliError("ROOT_NOT_FOUND", `Root not found: ${root}`, 1);
  }

  const issues: CheckIssue[] = [];

  const skillIssues = validateSkills(root);
  issues.push(...skillIssues);

  const inventoryPath = join(root, "design", "skills", "SKILL_INVENTORY.md");
  const expectedInventory = generateSkillInventoryMarkdown({ rootDir: root });
  if (!existsSync(inventoryPath)) {
    if (options.fix) {
      writeFileSync(inventoryPath, expectedInventory, "utf8");
      stdout.push("Wrote design/skills/SKILL_INVENTORY.md");
    } else {
      issues.push({ check: "inventory", message: "Missing design/skills/SKILL_INVENTORY.md" });
    }
  } else {
    const actual = readFileSync(inventoryPath, "utf8");
    if (actual !== expectedInventory) {
      if (options.fix) {
        writeFileSync(inventoryPath, expectedInventory, "utf8");
        stdout.push("Updated design/skills/SKILL_INVENTORY.md");
      } else {
        issues.push({ check: "inventory", message: "design/skills/SKILL_INVENTORY.md is out of date. Run `fpf check --fix`." });
      }
    }
  }

  const indexPath = join(root, "design", "skills", "SKILL_INDEX.json");
  const expectedIndex = generateSkillIndexJson({ rootDir: root });
  if (!existsSync(indexPath)) {
    if (options.fix) {
      writeFileSync(indexPath, expectedIndex, "utf8");
      stdout.push("Wrote design/skills/SKILL_INDEX.json");
    } else {
      issues.push({ check: "skill-index", message: "Missing design/skills/SKILL_INDEX.json" });
    }
  } else {
    const actual = readFileSync(indexPath, "utf8");
    if (actual !== expectedIndex) {
      if (options.fix) {
        writeFileSync(indexPath, expectedIndex, "utf8");
        stdout.push("Updated design/skills/SKILL_INDEX.json");
      } else {
        issues.push({ check: "skill-index", message: "design/skills/SKILL_INDEX.json is out of date. Run `fpf check --fix`." });
      }
    }
  }

  const inventoryCheckIssues = runInventoryChecks(root);
  issues.push(...inventoryCheckIssues.map((message) => ({ check: "inventory-checks", message })));

  const unicodeIssues = scanUnicodeSafety(root);
  issues.push(...unicodeIssues.map((issue) => ({ check: "unicode-safety", message: issue.message, file: issue.file })));

  if (issues.length > 0) {
    stderr.push(`Check failed (${issues.length} issue(s)).`);
    for (const issue of issues) {
      const prefix = issue.file ? `${issue.file}: ` : "";
      stderr.push(`- [${issue.check}] ${prefix}${issue.message}`);
    }
    return {
      exitCode: 2,
      json: {
        ok: false,
        command: "check",
        root,
        issues: issues
          .slice()
          .sort((a, b) => a.check.localeCompare(b.check) || (a.file ?? "").localeCompare(b.file ?? "") || a.message.localeCompare(b.message))
          .map((issue) => ({ ...issue, ...(issue.file ? { file: toPosixPath(issue.file) } : {}) })),
      },
      stdout,
      stderr,
    };
  }

  stdout.push("Check passed.");
  return {
    exitCode: 0,
    json: { ok: true, command: "check", root, issues: [] },
    stdout,
    stderr,
  };
}

type CheckOptions = {
  fix: boolean;
};

function parseArgs(argv: string[]): CheckOptions {
  let fix = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--fix") {
      fix = true;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      throw new CliError(
        "HELP",
        [
          "Usage: fpf check [--fix]",
          "",
          "Options:",
          "  --fix  Update generated files (design/skills/SKILL_INVENTORY.md, design/skills/SKILL_INDEX.json)",
        ].join("\n"),
        0,
      );
    }
    throw new CliError("UNKNOWN_ARG", `Unknown argument '${arg}'.`, 1);
  }

  return { fix };
}

function validateSkills(root: string): CheckIssue[] {
  const skillsRoot = resolve(root, "design", "skills");
  const files = existsSync(skillsRoot) ? findSkillFiles(skillsRoot) : [];
  if (files.length === 0) {
    return [{ check: "skillspec", message: "No skill.json files found under design/skills." }];
  }

  const nonJson = files.filter((filePath) => !filePath.endsWith("skill.json")).map((filePath) => toRepoRelative(filePath, root));
  if (nonJson.length > 0) {
    return nonJson.map((file) => ({ check: "skillspec", file, message: "SkillSpec must be JSON (skill.json)." }));
  }

  const schemaIssues: CheckIssue[] = [];
  const validSkills: SkillDoc[] = [];

  for (const filePath of files) {
    const relativePath = toRepoRelative(filePath, root);
    let data: unknown;
    try {
      data = loadJsonFile(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      schemaIssues.push({ check: "skillspec", file: relativePath, message: `parse error: ${message}` });
      continue;
    }
    const errors = validateSchema(data);
    if (errors.length > 0) {
      for (const err of errors) {
        schemaIssues.push({ check: "skillspec", file: relativePath, message: `${err.path} ${err.message}` });
      }
      continue;
    }
    validSkills.push({ path: relativePath, data: data as Record<string, unknown> });
  }

  if (schemaIssues.length > 0) {
    return schemaIssues;
  }

  const crossErrors = runCrossChecks(validSkills);
  if (crossErrors.length > 0) {
    return crossErrors.map((err) => ({ check: "skillspec", file: err.file, message: `${err.path} ${err.message}` }));
  }

  return [];
}
