#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSemicolonList } from "../../_shared/utils";

const args = Bun.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    context: { type: "string" },
    description: { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const description = (values.description ?? "").trim();
const roleAssignment = ((values["role-assignment"] ?? "Steward") as string).trim();
const relatedDecisions = parseSemicolonList(values.decisions);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);
const contextRoot = join(repoRoot, "runtime", "contexts", context);

const standardDirs = [join(contextRoot, "design", "names"), join(contextRoot, "planning", "workplans"), join(contextRoot, "telemetry", "work")];

for (const dir of standardDirs) {
  mkdirSync(dir, { recursive: true });
}

const readmePath = join(contextRoot, "README.md");
if (!existsSync(readmePath)) {
  writeFileSync(readmePath, renderReadme(context, description), "utf8");
}

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Initialized context '${context}'${description.length > 0 ? `: ${description}` : "."}`,
  outputs: [
    `runtime/contexts/${context}/README.md`,
    `runtime/contexts/${context}/design/names`,
    `runtime/contexts/${context}/planning/workplans`,
    `runtime/contexts/${context}/telemetry/work`,
  ],
  relatedDecisions,
});

console.log(`Initialized runtime/contexts/${context}/`);

function renderReadme(contextName: string, descriptionText: string): string {
  const purpose = descriptionText.length > 0 ? descriptionText : "TBD";
  return `# Context: ${contextName}

## Purpose
${purpose}

## Standard paths
- \`design/names\`
- \`planning/workplans\`
- \`telemetry/work\`
`;
}

function logWork(input: { repoRoot: string; context: string; roleAssignment: string; action: string; outputs: string[]; relatedDecisions: string[] }): void {
  const logScript = join(input.repoRoot, "develop", "skills", "src", "telemetry", "log-work", "index.ts");
  if (!existsSync(logScript)) {
    console.warn("WARN: telemetry/log-work skill not found; skipping audit trace.");
    return;
  }

  const cmd = [
    "bun",
    logScript,
    "--method",
    "design/init-context",
    "--role-assignment",
    input.roleAssignment,
    "--context",
    input.context,
    "--action",
    input.action,
    "--outputs",
    input.outputs.join("; "),
  ];
  if (input.relatedDecisions.length > 0) {
    cmd.push("--decisions", input.relatedDecisions.join("; "));
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

function printUsage(): void {
  console.log('Usage: bun develop/skills/src/design/init-context/index.ts --context <Context> [--description "..."] [--role-assignment <Role>] [--decisions "..."]');
}
