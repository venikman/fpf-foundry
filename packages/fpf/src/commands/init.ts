import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";
import { CliError } from "../lib/errors.ts";
import { generateSkillIndexJson } from "../skill/skill-index.ts";
import { stableStringify } from "../skill/skill-io.ts";
import { generateSkillInventoryMarkdown } from "../skill/skill-inventory.ts";

type CommandContext = {
  rootDir: string;
};

export async function runInitAsync(ctx: CommandContext, argv: string[]): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const options = parseArgs(argv);
  if (options.template !== "minimal") {
    throw new CliError("INVALID_TEMPLATE", `Unknown template '${options.template}'.`, 1);
  }

  if (!existsSync(ctx.rootDir)) {
    mkdirSync(ctx.rootDir, { recursive: true });
    stdout.push(`Created root: ${ctx.rootDir}`);
  }

  const plannedFiles = loadTemplateFiles(options.template);
  const conflicts = options.force ? [] : plannedFiles.filter((file) => existsSync(join(ctx.rootDir, file.path))).map((file) => file.path);
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  if (conflicts.length > 0) {
    return {
      exitCode: 1,
      json: {
        ok: false,
        command: "init",
        root: ctx.rootDir,
        error: { code: "CONFLICT", message: "Refusing to overwrite existing files. Use --force to overwrite.", details: { conflicts } },
      },
      stdout: [],
      stderr: [`Refusing to overwrite ${conflicts.length} existing file(s). Use --force to overwrite.`],
    };
  }

  for (const file of plannedFiles) {
    const absPath = join(ctx.rootDir, file.path);
    mkdirSync(dirname(absPath), { recursive: true });
    const existed = existsSync(absPath);
    writeFileSync(absPath, file.content, "utf8");
    (existed ? updated : created).push(file.path);
  }

  const inventoryAbsPath = join(ctx.rootDir, "design", "skills", "SKILL_INVENTORY.md");
  const inventoryContent = generateSkillInventoryMarkdown({ rootDir: ctx.rootDir });
  mkdirSync(dirname(inventoryAbsPath), { recursive: true });
  const inventoryExisted = existsSync(inventoryAbsPath);
  writeFileSync(inventoryAbsPath, inventoryContent, "utf8");
  (inventoryExisted ? updated : created).push("design/skills/SKILL_INVENTORY.md");

  const indexAbsPath = join(ctx.rootDir, "design", "skills", "SKILL_INDEX.json");
  const indexContent = generateSkillIndexJson({ rootDir: ctx.rootDir });
  mkdirSync(dirname(indexAbsPath), { recursive: true });
  const indexExisted = existsSync(indexAbsPath);
  writeFileSync(indexAbsPath, indexContent, "utf8");
  (indexExisted ? updated : created).push("design/skills/SKILL_INDEX.json");

  return {
    exitCode: 0,
    json: {
      ok: true,
      command: "init",
      root: ctx.rootDir,
      template: options.template,
      created: created.sort(),
      updated: updated.sort(),
      skipped: skipped.sort(),
    },
    stdout: [
      ...stdout,
      `Initialized FPF workspace (${options.template}).`,
      ...created.map((p) => `+ ${p}`),
      ...updated.map((p) => `~ ${p}`),
    ],
    stderr,
  };
}

type InitOptions = {
  template: "minimal";
  force: boolean;
};

function parseArgs(argv: string[]): InitOptions {
  let template: "minimal" = "minimal";
  let force = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--template") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        throw new CliError("MISSING_ARG", "Missing value for --template.", 1);
      }
      if (value !== "minimal") {
        throw new CliError("INVALID_TEMPLATE", `Unknown template '${value}'.`, 1);
      }
      template = "minimal";
      i += 1;
      continue;
    }
    if (arg.startsWith("--template=")) {
      const value = arg.slice("--template=".length);
      if (value !== "minimal") {
        throw new CliError("INVALID_TEMPLATE", `Unknown template '${value}'.`, 1);
      }
      template = "minimal";
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      throw new CliError(
        "HELP",
        [
          "Usage: fpf init [--template minimal] [--force]",
          "",
          "Options:",
          "  --template <name>  Template name (default: minimal)",
          "  --force            Overwrite existing files",
        ].join("\n"),
        0,
      );
    }
    throw new CliError("UNKNOWN_ARG", `Unknown argument '${arg}'.`, 1);
  }

  return { template, force };
}

function loadTemplateFiles(template: "minimal"): Array<{ path: string; content: string }> {
  const embedded = buildMinimalFiles();
  let templateDir: string;
  try {
    templateDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../templates", template);
  } catch {
    return embedded;
  }

  try {
    if (!existsSync(templateDir) || !statSync(templateDir).isDirectory()) {
      return embedded;
    }
  } catch {
    return embedded;
  }

  const diskFiles = listFilesRecursive(templateDir);
  if (diskFiles.length === 0) {
    return embedded;
  }

  return diskFiles
    .map((absPath) => {
      const rel = relative(templateDir, absPath).split("\\").join("/");
      return { path: rel, content: readFileSync(absPath, "utf8") };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function listFilesRecursive(rootDir: string): string[] {
  const results: string[] = [];
  walk(rootDir, results);
  return results;

  function walk(dir: string, list: string[]): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, list);
      } else if (entry.isFile()) {
        list.push(fullPath);
      }
    }
  }
}

function buildMinimalFiles(): Array<{ path: string; content: string }> {
  const skillJson = {
    schema_version: "0.1.0",
    id: "example/hello",
    name: "Hello Skill",
    summary: "Demonstration SkillSpec created by fpf init.",
    conformance: {
      checklist: ["inputs_validated", "outputs_listed", "u_work_emitted", "deterministic_naming", "inventory_updated"],
    },
    intent: {
      goal: "Demonstrate a minimal SkillSpec.",
      non_goals: ["Does not perform real work."],
    },
    inputs: [],
    outputs: [],
    procedure: [
      {
        step_id: "step-1",
        instruction: "Do nothing; this is an example SkillSpec.",
      },
    ],
    constraints: { safety: [], privacy: [], licensing: [] },
    dependencies: { tools: [], skills: [] },
    eval: {
      acceptance_criteria: ["Schema validation passes."],
      tests: [
        {
          name: "example-test",
          input_fixture: {},
          expected: {},
        },
      ],
    },
    version: "0.1.0",
    metadata: {
      tags: ["example"],
      authors: ["FPF Foundry"],
      created: "2026-01-01",
      updated: "2026-01-01",
    },
  };

  const skillMd = `---
name: example/hello
description: Example Skill created by fpf init (safe to delete).
version: 0.1.0
status: planned
family: example
---

# Example: Hello

This is an example Skill. Edit or delete freely.
`;

  const gitignore = `node_modules/
.DS_Store
.env
dist/
coverage/
.bun/
runtime/out/
runtime/contexts/
runtime/skills/index.json
`;

  const runtimeReadme = `This directory contains generated runtime outputs (intentionally not committed by default).

Common outputs:
- \`runtime/out/\` (ignored): compile outputs and temp artifacts.
- \`runtime/skills/index.json\` (ignored): generated SkillSpec index.
- \`runtime/contexts/\` (ignored): generated context/runtime artifacts.

Most tooling will create required subdirectories on demand.
`;

  return [
    { path: ".gitignore", content: gitignore },
    { path: "runtime/README.md", content: runtimeReadme },
    { path: "design/skills/example/hello/skill.json", content: stableStringify(skillJson) },
    { path: "design/skills/example/hello/SKILL.md", content: skillMd },
  ];
}
