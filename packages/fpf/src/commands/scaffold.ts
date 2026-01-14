import { accessSync, constants, existsSync, mkdirSync, statSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { CliError } from "../lib/errors.ts";
import { parseSemicolonList } from "../lib/strings.ts";
import { resolveNow } from "../lib/time.ts";
import { generateSkillIndexJson } from "../skill/skill-index.ts";
import { generateSkillInventoryMarkdown } from "../skill/skill-inventory.ts";
import { sortKeys, stableStringify, toRepoRelative } from "../skill/skill-io.ts";
import { logWorkAsync } from "./log-work.ts";

type CommandContext = {
  rootDir: string;
};

type ScaffoldSkillOptions = {
  skillId: string;
  name: string;
  summary: string;
  family: string;
  role: string;
  status: string;
  version: string;
  tags: string[];
  policies: string[];
  workContext: string;
  decisions: string[];
};

const skillIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
const allowedStatus = new Set(["planned", "experimental", "stable", "deprecated"]);

export async function runScaffoldAsync(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    throw new CliError(
      "HELP",
      [
        "Usage: fpf scaffold <subcommand> [args]",
        "",
        "Subcommands:",
        "  skill",
      ].join("\n"),
      0,
    );
  }

  const [subcommand, ...rest] = argv;
  if (subcommand !== "skill") {
    throw new CliError("UNKNOWN_ARG", `Unknown scaffold subcommand '${subcommand}'.`, 1);
  }

  return runScaffoldSkillAsync(ctx, rest);
}

async function runScaffoldSkillAsync(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const options = parseSkillArgs(argv);
  ensureRootWritable(ctx.rootDir);

  const rootDir = ctx.rootDir;
  const skillDir = join(rootDir, "design", "skills", ...options.skillId.split("/"));
  const specPath = join(skillDir, "skill.json");
  const skillMdPath = join(skillDir, "SKILL.md");
  const codeDir = join(rootDir, "develop", "skills", "src", ...options.skillId.split("/"));
  const codePath = join(codeDir, "index.ts");
  const fixturesDir = join(codeDir, "fixtures");
  const fixtureInputPath = join(fixturesDir, "input.json");
  const fixtureExpectedPath = join(fixturesDir, "expected.json");
  const testPath = join(codeDir, "index.test.ts");

  const plannedFiles = [specPath, skillMdPath, codePath, fixtureInputPath, fixtureExpectedPath, testPath];
  for (const filePath of plannedFiles) {
    if (existsSync(filePath)) {
      throw new CliError("ALREADY_EXISTS", `Path already exists at ${toRepoRelative(filePath, rootDir)}`, 1);
    }
  }

  mkdirSync(skillDir, { recursive: true });
  mkdirSync(fixturesDir, { recursive: true });

  const today = resolveNow().toISOString().slice(0, 10);
  const metaTags = options.tags.length > 0 ? options.tags : [options.family.toLowerCase()];

  const inputFixture = { example: "value" };
  const expectedFixture = { example: "value" };

  const skillSpec = {
    schema_version: "0.1.0",
    id: options.skillId,
    name: options.name,
    summary: options.summary,
    conformance: {
      checklist: ["inputs_validated", "outputs_listed", "u_work_emitted", "deterministic_naming", "inventory_updated"],
    },
    intent: {
      goal: options.summary,
      non_goals: [],
    },
    inputs: [],
    outputs: [],
    procedure: [
      {
        step_id: "step-todo",
        instruction: "TODO: Define an executable procedure.",
      },
    ],
    constraints: {
      safety: [],
      privacy: [],
      licensing: [],
    },
    dependencies: {
      tools: [],
      skills: [],
    },
    eval: {
      acceptance_criteria: ["TODO: Define acceptance criteria."],
      tests: [
        {
          name: "placeholder",
          input_fixture: inputFixture,
          expected: expectedFixture,
          notes: "Scaffolded placeholder test. Replace with real harnessed expectations.",
        },
      ],
    },
    version: options.version,
    metadata: {
      tags: metaTags,
      authors: ["FPF Foundry"],
      created: today,
      updated: today,
    },
  };

  writeFileSync(specPath, stableStringify(sortKeys(skillSpec)), "utf8");
  writeFileSync(
    skillMdPath,
    renderSkillMd({
      skillId: options.skillId,
      name: options.name,
      summary: options.summary,
      version: options.version,
      status: options.status,
      family: options.family,
      role: options.role,
      policies: options.policies,
    }),
    "utf8",
  );
  writeFileSync(codePath, renderCodeStub(options.skillId), "utf8");
  writeFileSync(fixtureInputPath, stableStringify(inputFixture), "utf8");
  writeFileSync(fixtureExpectedPath, stableStringify(expectedFixture), "utf8");
  writeFileSync(testPath, renderTestStub(options.skillId), "utf8");

  const created: string[] = [
    toRepoRelative(specPath, rootDir),
    toRepoRelative(skillMdPath, rootDir),
    toRepoRelative(codePath, rootDir),
    toRepoRelative(fixtureInputPath, rootDir),
    toRepoRelative(fixtureExpectedPath, rootDir),
    toRepoRelative(testPath, rootDir),
  ];
  const updated: string[] = [];

  const inventoryPath = join(rootDir, "design", "skills", "SKILL_INVENTORY.md");
  const inventoryContent = generateSkillInventoryMarkdown({ rootDir });
  mkdirSync(dirname(inventoryPath), { recursive: true });
  const inventoryRel = toRepoRelative(inventoryPath, rootDir);
  if (existsSync(inventoryPath)) {
    writeFileSync(inventoryPath, inventoryContent, "utf8");
    updated.push(inventoryRel);
  } else {
    writeFileSync(inventoryPath, inventoryContent, "utf8");
    created.push(inventoryRel);
  }

  const indexPath = join(rootDir, "design", "skills", "SKILL_INDEX.json");
  const indexContent = generateSkillIndexJson({ rootDir });
  mkdirSync(dirname(indexPath), { recursive: true });
  const indexRel = toRepoRelative(indexPath, rootDir);
  if (existsSync(indexPath)) {
    writeFileSync(indexPath, indexContent, "utf8");
    updated.push(indexRel);
  } else {
    writeFileSync(indexPath, indexContent, "utf8");
    created.push(indexRel);
  }

  const warnings: Array<{ code: string; message: string }> = [];
  try {
    const work = await logWorkAsync({
      rootDir,
      input: {
        method: "design/scaffold-skill",
        roleAssignment: options.role,
        context: options.workContext,
        action: `Scaffolded skill '${options.skillId}' (${options.name})`,
        outputs: [
          toRepoRelative(specPath, rootDir),
          toRepoRelative(skillMdPath, rootDir),
          toRepoRelative(codePath, rootDir),
          toRepoRelative(fixtureInputPath, rootDir),
          toRepoRelative(fixtureExpectedPath, rootDir),
          toRepoRelative(testPath, rootDir),
          inventoryRel,
          indexRel,
        ],
        decisions: options.decisions,
      },
      warnings,
      silent: true,
      stdout,
      stderr,
    });
    created.push(work.workRecordPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push({ code: "WORK_LOG_FAILED", message });
  }

  return {
    exitCode: 0,
    json: {
      ok: true,
      command: "scaffold",
      subcommand: "skill",
      root: rootDir,
      skillId: options.skillId,
      created: created.sort(),
      updated: updated.sort(),
      warnings,
    },
    stdout: [
      `Scaffolded ${options.skillId}`,
      ...created.sort().map((entry) => `+ ${entry}`),
      ...updated.sort().map((entry) => `~ ${entry}`),
    ],
    stderr: warnings.map((warning) => `WARN: ${warning.message}`),
  };
}

function parseSkillArgs(argv: string[]): ScaffoldSkillOptions {
  let skillId = "";
  let name = "";
  let summary = "";
  let family: string | undefined;
  let role: string | undefined;
  let status: string | undefined;
  let version: string | undefined;
  let tags: string[] = [];
  let policies: string[] = [];
  let workContext: string | undefined;
  let decisions: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      throw new CliError(
        "HELP",
        [
          "Usage: fpf scaffold skill --skill-id <id> --name <title> --summary <summary> [options]",
          "",
          "Options:",
          "  --family <family>          Overrides family (default: first id segment)",
          "  --role <role>              RoleAssignment label (default: Toolsmith)",
          "  --status <status>          planned | experimental | stable | deprecated (default: planned)",
          "  --version <semver>         Skill version (default: 0.1.0)",
          "  --tags \"a; b\"              Semicolon-delimited metadata tags",
          "  --policies \"A.15; E.19\"    Semicolon-delimited policy references for SKILL.md",
          "  --work-context <ctx>       Work logging context (default: Skills)",
          "  --decisions \"003-...; ...\" Semicolon-delimited related decision ids/paths",
        ].join("\n"),
        0,
      );
    }
    if (arg === "--skill-id") {
      skillId = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--name") {
      name = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--summary") {
      summary = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--family") {
      family = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--role") {
      role = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--status") {
      status = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--version") {
      version = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--tags") {
      tags = parseSemicolonList(requireArgValue(argv, i, arg));
      i += 1;
      continue;
    }
    if (arg === "--policies") {
      policies = parseSemicolonList(requireArgValue(argv, i, arg));
      i += 1;
      continue;
    }
    if (arg === "--work-context") {
      workContext = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--decisions") {
      decisions = parseSemicolonList(requireArgValue(argv, i, arg));
      i += 1;
      continue;
    }

    throw new CliError("UNKNOWN_ARG", `Unknown argument '${arg}'.`, 1);
  }

  const skillIdValue = requireMatch(skillId, skillIdPattern, "skill-id", "lowercase kebab-case segments (slash-separated)");
  const nameValue = normalizeOneLine(requireNonEmpty(name, "name"));
  const summaryValue = normalizeOneLine(requireNonEmpty(summary, "summary"));
  const statusValue = (status ?? "planned").trim();
  if (!allowedStatus.has(statusValue)) {
    throw new CliError(
      "INVALID_ARG",
      `Invalid status '${statusValue}'. Expected one of: planned, experimental, stable, deprecated.`,
      1,
    );
  }

  const familyValue = (family ?? skillIdValue.split("/")[0] ?? "design").trim();
  return {
    skillId: skillIdValue,
    name: nameValue,
    summary: summaryValue,
    status: statusValue,
    version: requireNonEmpty(version ?? "0.1.0", "version"),
    family: familyValue,
    role: (role ?? "Toolsmith").trim(),
    tags,
    policies,
    workContext: requireNonEmpty(workContext ?? "Skills", "work-context"),
    decisions,
  };
}

function renderSkillMd(input: {
  skillId: string;
  name: string;
  summary: string;
  version: string;
  status: string;
  family: string;
  role: string;
  policies: string[];
}): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: ${input.skillId}`);
  lines.push(`description: ${yamlString(input.summary)}`);
  lines.push(`version: ${input.version}`);
  lines.push(`status: ${input.status}`);
  lines.push(`family: ${input.family.toLowerCase()}`);
  lines.push(`role: ${yamlString(input.role)}`);
  lines.push("allowed_tools:");
  lines.push("  - list_dir");
  lines.push("  - view_file");
  lines.push("  - write_to_file");
  if (input.policies.length > 0) {
    lines.push("policies:");
    for (const policy of input.policies) {
      lines.push(`  - ${yamlString(policy)}`);
    }
  }
  lines.push("---");
  lines.push("");
  lines.push(`# ${toTitleCase(input.family)}: ${input.name}`);
  lines.push("");
  lines.push("## Status");
  lines.push(input.status);
  lines.push("");
  lines.push("## Notes");
  lines.push("- Scaffolded via `design/scaffold-skill`.");
  lines.push("");
  return lines.join("\n");
}

function renderCodeStub(skillIdValue: string): string {
  return `#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type SkillInput = {
  example: string;
};

export type SkillOutput = {
  example: string;
};

export function runSkill(input: SkillInput): SkillOutput {
  throw new Error("TODO: Implement ${skillIdValue}.");
}

if (import.meta.main) {
  if (Bun.argv.includes("-h") || Bun.argv.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const options = parseArgs(Bun.argv.slice(2));
  const input = loadJson<SkillInput>(options.inputPath);
  const output = runSkill(input);
  const serialized = JSON.stringify(output, null, 2) + \"\\n\";
  if (options.outputPath) {
    writeFileSync(options.outputPath, serialized, "utf8");
  } else {
    process.stdout.write(serialized);
  }
}

type CliOptions = {
  inputPath: string;
  outputPath?: string;
};

function parseArgs(argv: string[]): CliOptions {
  let inputPath = "";
  let outputPath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") {
      inputPath = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--output") {
      outputPath = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    fail("Unknown argument '" + arg + "'.");
  }

  if (inputPath.trim().length === 0) {
    inputPath = join(import.meta.dir, "fixtures", "input.json");
  }

  return { inputPath, outputPath };
}

function loadJson<T>(filePath: string): T {
  const text = readFileSync(filePath, "utf8");
  return JSON.parse(text) as T;
}

function requireArgValue(argv: string[], index: number, name: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    fail("Missing value for " + name + ".");
  }
  return value;
}

function fail(message: string): never {
  console.error(message);
  printUsage();
  process.exit(1);
}

function printUsage(): void {
  console.log("Usage: bun develop/skills/src/${skillIdValue}/index.ts [--input <path>] [--output <path>]");
}
`;
}

function renderTestStub(skillIdValue: string): string {
  return `import { expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { runSkill, type SkillInput, type SkillOutput } from "./index";

function loadFixture<T>(name: string): T {
  const filePath = join(import.meta.dir, "fixtures", name);
  const content = readFileSync(filePath, "utf8");
  return JSON.parse(content) as T;
}

test("${skillIdValue} fixtures", () => {
  const input = loadFixture<SkillInput>("input.json");
  const expected = loadFixture<SkillOutput>("expected.json");
  const result = runSkill(input);
  expect(result).toEqual(expected);
});
`;
}

function ensureRootWritable(rootDir: string): void {
  if (!existsSync(rootDir)) {
    throw new CliError("ROOT_NOT_FOUND", `Root not found: ${rootDir}`, 1);
  }
  if (!safeIsDirectory(rootDir)) {
    throw new CliError("ROOT_NOT_DIRECTORY", `Root is not a directory: ${rootDir}`, 1);
  }
  try {
    accessSync(rootDir, constants.W_OK);
  } catch {
    throw new CliError("ROOT_NOT_WRITABLE", `Root is not writable: ${rootDir}`, 1);
  }
}

function safeIsDirectory(pathValue: string): boolean {
  try {
    return statSync(pathValue).isDirectory();
  } catch {
    return false;
  }
}

function requireArgValue(argv: string[], index: number, name: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    throw new CliError("MISSING_ARG", `Missing value for ${name}.`, 1);
  }
  return value;
}

function requireNonEmpty(value: string | undefined, name: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    throw new CliError("MISSING_ARG", `Missing ${name}.`, 1);
  }
  return trimmed;
}

function requireMatch(value: string | undefined, pattern: RegExp, name: string, description: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0 || !pattern.test(trimmed)) {
    throw new CliError("INVALID_ARG", `Invalid ${name} '${value ?? ""}'. Expected ${description}.`, 1);
  }
  return trimmed;
}

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function normalizeOneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
