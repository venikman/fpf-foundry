#!/usr/bin/env bun
import { parseArgs } from "util";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

type CliOptions = {
  skillId: string;
  name: string;
  summary: string;
  family?: string;
  role?: string;
  status?: string;
  version?: string;
  tags?: string;
  policies?: string;
  workContext?: string;
  decisions?: string;
};

const args = Bun.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const options = parseCliOptions();
const skillIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
const skillId = requireMatch(options.skillId, skillIdPattern, "skill-id", "lowercase kebab-case segments (slash-separated)");
const name = normalizeOneLine(requireNonEmpty(options.name, "name"));
const summary = normalizeOneLine(requireNonEmpty(options.summary, "summary"));
const status = (options.status ?? "planned").trim();
const version = requireNonEmpty(options.version ?? "0.1.0", "version");
const family = (options.family ?? skillId.split("/")[0] ?? "design").trim();
const role = (options.role ?? "Toolsmith").trim();
const tags = parseSemicolonList(options.tags);
const policies = parseSemicolonList(options.policies);
const workContext = requireNonEmpty(options.workContext ?? "Skills", "work-context");
const decisions = parseSemicolonList(options.decisions);

const allowedStatus = new Set(["planned", "experimental", "stable", "deprecated"]);
if (!allowedStatus.has(status)) {
  console.error(`Invalid status '${status}'. Expected one of: planned, experimental, stable, deprecated.`);
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

const skillDir = join(repoRoot, "design", "skills", ...skillId.split("/"));
const specPath = join(skillDir, "skill.json");
const skillMdPath = join(skillDir, "SKILL.md");
const codeDir = join(repoRoot, "develop", "skills", "src", ...skillId.split("/"));
const codePath = join(codeDir, "index.ts");

assertDoesNotExist(specPath);
assertDoesNotExist(skillMdPath);
assertDoesNotExist(codePath);

mkdirSync(skillDir, { recursive: true });
mkdirSync(codeDir, { recursive: true });

const today = resolveNow().toISOString().slice(0, 10);
const metaTags = tags.length > 0 ? tags : [family.toLowerCase()];

const skillSpec = {
  schema_version: "0.1.0",
  id: skillId,
  name,
  summary,
  conformance: {
    checklist: ["inputs_validated", "outputs_listed", "u_work_emitted", "deterministic_naming", "inventory_updated"],
  },
  intent: {
    goal: summary,
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
        input_fixture: {},
        expected: {},
        notes: "Scaffolded placeholder test. Replace with real harnessed expectations.",
      },
    ],
  },
  version,
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
    skillId,
    name,
    summary,
    version,
    status,
    family,
    role,
    policies,
  }),
  "utf8",
);
writeFileSync(codePath, renderCodeStub(skillId), "utf8");

runOrExit(["bun", "develop/tools/skill/validate.ts", toRepoRelative(specPath, repoRoot)], repoRoot, "SkillSpec validation failed.");
runOrExit(["bun", "develop/tools/skill/inventory.ts"], repoRoot, "Inventory regeneration failed.");

logWork({
  repoRoot,
  roleAssignment: role,
  workContext,
  action: `Scaffolded skill '${skillId}' (${name})`,
  outputs: [
    toRepoRelative(specPath, repoRoot),
    toRepoRelative(skillMdPath, repoRoot),
    toRepoRelative(codePath, repoRoot),
    "design/skills/SKILL_INVENTORY.md",
  ],
  decisions,
});

console.log(`Scaffolded ${skillId}`);
console.log(`- ${toRepoRelative(specPath, repoRoot)}`);
console.log(`- ${toRepoRelative(skillMdPath, repoRoot)}`);
console.log(`- ${toRepoRelative(codePath, repoRoot)}`);

function parseCliOptions(): CliOptions {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      "skill-id": { type: "string" },
      name: { type: "string" },
      summary: { type: "string" },
      family: { type: "string" },
      role: { type: "string" },
      status: { type: "string" },
      version: { type: "string" },
      tags: { type: "string" },
      policies: { type: "string" },
      "work-context": { type: "string" },
      decisions: { type: "string" },
    },
    strict: true,
    allowPositionals: true,
  });

  if (!values["skill-id"] || !values.name || !values.summary) {
    printUsage();
    process.exit(1);
  }

  return {
    skillId: String(values["skill-id"]),
    name: String(values.name),
    summary: String(values.summary),
    family: values.family ? String(values.family) : undefined,
    role: values.role ? String(values.role) : undefined,
    status: values.status ? String(values.status) : undefined,
    version: values.version ? String(values.version) : undefined,
    tags: values.tags ? String(values.tags) : undefined,
    policies: values.policies ? String(values.policies) : undefined,
    workContext: values["work-context"] ? String(values["work-context"]) : undefined,
    decisions: values.decisions ? String(values.decisions) : undefined,
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

if (Bun.argv.includes("-h") || Bun.argv.includes("--help")) {
  console.log("TODO: Implement ${skillIdValue}.");
  process.exit(0);
}

console.error("TODO: Implement ${skillIdValue}.");
process.exit(1);
`;
}

function logWork(input: {
  repoRoot: string;
  roleAssignment: string;
  workContext: string;
  action: string;
  outputs: string[];
  decisions: string[];
}): void {
  const logScript = join(input.repoRoot, "develop", "skills", "src", "telemetry", "log-work", "index.ts");
  if (!existsSync(logScript)) {
    console.warn("WARN: telemetry/log-work skill not found; skipping audit trace.");
    return;
  }

  const cmd = [
    "bun",
    logScript,
    "--method",
    "design/scaffold-skill",
    "--role-assignment",
    input.roleAssignment,
    "--context",
    input.workContext,
    "--action",
    input.action,
    "--outputs",
    input.outputs.join("; "),
  ];
  if (input.decisions.length > 0) {
    cmd.push("--decisions", input.decisions.join("; "));
  }

  const proc = Bun.spawnSync({ cmd, cwd: input.repoRoot, stdout: "pipe", stderr: "pipe" });
  if (proc.exitCode === 0) {
    return;
  }
  const stdoutText = proc.stdout ? new TextDecoder().decode(proc.stdout) : "";
  const stderrText = proc.stderr ? new TextDecoder().decode(proc.stderr) : "";
  console.warn("WARN: Failed to log work.");
  if (stdoutText.trim().length > 0) {
    console.warn("log-work stdout:");
    console.warn(stdoutText.trimEnd());
  }
  if (stderrText.trim().length > 0) {
    console.warn("log-work stderr:");
    console.warn(stderrText.trimEnd());
  }
}

function runOrExit(cmd: string[], cwd: string, errorMessage: string): void {
  const proc = Bun.spawnSync({ cmd, cwd, stdout: "inherit", stderr: "inherit" });
  if (proc.exitCode !== 0) {
    console.error(errorMessage);
    process.exit(proc.exitCode ?? 1);
  }
}

function assertDoesNotExist(filePath: string): void {
  if (existsSync(filePath)) {
    console.error(`Error: Path already exists at ${filePath}`);
    process.exit(1);
  }
}

function parseSemicolonList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    const sorted: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      sorted[key] = sortKeys(entryValue);
    }
    return sorted;
  }
  return value;
}

function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function requireNonEmpty(value: string | undefined, name: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    console.error(`Missing ${name}.`);
    process.exit(1);
  }
  return trimmed;
}

function requireMatch(value: string | undefined, pattern: RegExp, name: string, description: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0 || !pattern.test(trimmed)) {
    console.error(`Invalid ${name} '${value ?? ""}'. Expected ${description}.`);
    process.exit(1);
  }
  return trimmed;
}

function findRepoRoot(startDir: string): string {
  let current = startDir;
  while (true) {
    if (existsSync(join(current, "package.json"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      console.error("Could not locate repository root (package.json not found).");
      process.exit(1);
    }
    current = parent;
  }
}

function toRepoRelative(filePath: string, rootDir: string): string {
  const rel = relative(rootDir, resolve(filePath));
  return rel.length === 0 ? "." : rel.split("\\").join("/");
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

function resolveNow(): Date {
  const fixedNow = process.env.FPF_FIXED_NOW?.trim();
  if (fixedNow && fixedNow.length > 0) {
    const parsed = new Date(fixedNow);
    if (Number.isNaN(parsed.getTime())) {
      console.error(`Invalid FPF_FIXED_NOW '${fixedNow}'. Expected an ISO-8601 date-time.`);
      process.exit(1);
    }
    return parsed;
  }

  return new Date();
}

function printUsage(): void {
  console.log("Usage: bun develop/skills/src/design/scaffold-skill/index.ts --skill-id <id> --name <title> --summary <summary> [options]");
  console.log("");
  console.log("Options:");
  console.log("  --family <family>          Overrides family (default: first id segment).");
  console.log("  --role <role>              RoleAssignment label (default: Toolsmith).");
  console.log("  --status <status>          planned | experimental | stable | deprecated (default: planned).");
  console.log("  --version <semver>         Skill version (default: 0.1.0).");
  console.log("  --tags \"a; b\"              Semicolon-delimited metadata tags.");
  console.log("  --policies \"A.15; E.19\"    Semicolon-delimited policy references for SKILL.md.");
  console.log("  --work-context <ctx>       Work logging context (default: Skills).");
  console.log("  --decisions \"003-...; ...\" Semicolon-delimited related decision ids/paths.");
}
