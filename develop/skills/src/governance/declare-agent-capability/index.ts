#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSemicolonList, resolveNow } from "../../_shared/utils";

const args = Bun.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    context: { type: "string" },
    "capability-id": { type: "string" },
    title: { type: "string" },
    "work-scope": { type: "string" },
    "work-measures": { type: "string" },
    holder: { type: "string" },
    "valid-from": { type: "string" },
    "valid-until": { type: "string" },
    notes: { type: "string" },
    "agent-type": { type: "string" },
    "agent-model": { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values["capability-id"] || !values.title || !values["work-scope"] || !values["work-measures"]) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const capabilityId = requireMatch(values["capability-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "capability-id", "a safe path segment (letters, digits, '_' or '-')");
const title = requireNonEmpty(values.title, "title");
const workScope = parseSemicolonList(values["work-scope"]);
const workMeasures = parseSemicolonList(values["work-measures"]);
if (workScope.length === 0) {
  console.error("Missing work-scope entries.");
  process.exit(1);
}
if (workMeasures.length === 0) {
  console.error("Missing work-measures entries.");
  process.exit(1);
}

const holder = normalizeOptional(values.holder);
const validFrom = normalizeOptional(values["valid-from"]);
const validUntil = normalizeOptional(values["valid-until"]);
validateIsoTimestamp(validFrom, "valid-from");
validateIsoTimestamp(validUntil, "valid-until");
const notes = normalizeOptional(values.notes);
const agentType = normalizeOptional(values["agent-type"]);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "Strategist";
const relatedDecisions = parseSemicolonList(values.decisions);

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

const capabilityDir = join(repoRoot, "runtime", "contexts", context, "capabilities");
mkdirSync(capabilityDir, { recursive: true });
const capabilityPath = join(capabilityDir, `${capabilityId}.capability.yaml`);
if (existsSync(capabilityPath)) {
  console.error(`Error: Capability declaration already exists at ${capabilityPath}`);
  process.exit(1);
}

const yaml = renderCapabilityYaml({
  context,
  capabilityId,
  title,
  declaredAt: isoTimestamp,
  holder,
  workScope,
  workMeasures,
  validFrom,
  validUntil,
  notes,
  agentType,
  agentModel,
});

await Bun.write(capabilityPath, yaml);

const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Declared capability '${capabilityId}' in ${context}.`,
  outputs: [toRepoRelative(capabilityPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: undefined,
  agentModel,
  agentType,
  timestampStart: values["timestamp-start"],
});

console.log(`Capability declared: ${capabilityPath}`);

function renderCapabilityYaml(input: {
  context: string;
  capabilityId: string;
  title: string;
  declaredAt: string;
  holder?: string;
  workScope: string[];
  workMeasures: string[];
  validFrom?: string;
  validUntil?: string;
  notes?: string;
  agentType?: string;
  agentModel?: string;
}): string {
  const lines = [
    `schema_version: "0.1.0"`,
    `type: U.CapabilityDeclaration`,
    `version: "0.1.0"`,
    `context: ${JSON.stringify(input.context)}`,
    `capability_id: ${JSON.stringify(input.capabilityId)}`,
    `title: ${JSON.stringify(input.title)}`,
    `declared_at: ${JSON.stringify(input.declaredAt)}`,
  ];
  if (input.holder) {
    lines.push(`holder: ${JSON.stringify(input.holder)}`);
  }
  if (input.agentType) {
    lines.push(`declared_by: ${JSON.stringify(input.agentType)}`);
  }
  if (input.agentModel) {
    lines.push(`declared_model: ${JSON.stringify(input.agentModel)}`);
  }
  if (input.validFrom) {
    lines.push(`valid_from: ${JSON.stringify(input.validFrom)}`);
  }
  if (input.validUntil) {
    lines.push(`valid_until: ${JSON.stringify(input.validUntil)}`);
  }
  lines.push(renderYamlKeyList("work_scope", input.workScope));
  lines.push(renderYamlKeyList("work_measures", input.workMeasures));
  if (input.notes) {
    lines.push(`notes: ${JSON.stringify(input.notes)}`);
  }
  return `${lines.join("\n")}
`;
}

function renderYamlKeyList(key: string, values: string[]): string {
  if (values.length === 0) {
    return `${key}: []`;
  }
  return `${key}:\n${values.map((value) => `  - ${JSON.stringify(value)}`).join("\n")}`;
}

function logWork(input: {
  repoRoot: string;
  context: string;
  roleAssignment: string;
  action: string;
  outputs: string[];
  relatedDecisions: string[];
  agentSession?: string;
  agentModel?: string;
  agentType?: string;
  timestampStart?: string;
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
    "governance/declare-agent-capability",
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
  if (input.agentSession) {
    cmd.push("--agent-session", input.agentSession);
  }
  if (input.agentModel) {
    cmd.push("--agent-model", input.agentModel);
  }
  if (input.agentType) {
    cmd.push("--agent-type", input.agentType);
  }
  if (input.timestampStart && input.timestampStart.trim().length > 0) {
    cmd.push("--timestamp-start", input.timestampStart.trim());
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

function resolveTimestampStart(value?: string): Date {
  const explicit = (value ?? "").trim();
  if (explicit.length > 0) {
    const parsed = new Date(explicit);
    if (Number.isNaN(parsed.getTime())) {
      console.error(`Invalid timestamp-start '${explicit}'. Expected an ISO-8601 date-time.`);
      process.exit(1);
    }
    return parsed;
  }
  return resolveNow();
}

function normalizeArtifactRef(value: string, repoRootDir: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;

  const absolute = isAbsolute(trimmed) ? trimmed : resolve(repoRootDir, trimmed);
  const rel = relative(repoRootDir, absolute);
  const isOutsideRoot = isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`);
  if (!isOutsideRoot) {
    return toRepoRelative(absolute, repoRootDir);
  }

  return trimmed;
}

function toRepoRelative(filePath: string, rootDir = process.cwd()): string {
  const rel = relative(rootDir, filePath);
  return rel.length === 0 ? "." : rel.split("\\").join("/");
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

function validateIsoTimestamp(value: string | undefined, label: string): void {
  if (!value) return;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    console.error(`Invalid ${label} '${value}'. Expected an ISO-8601 date-time.`);
    process.exit(1);
  }
}

function normalizeOptional(value?: string): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
  console.log(
    "Usage: bun develop/skills/src/governance/declare-agent-capability/index.ts --context <Context> --capability-id <Id> --title <Title> --work-scope \"a; b\" --work-measures \"a; b\" [--holder \"...\"] [--valid-from <iso>] [--valid-until <iso>] [--notes \"...\"] [--agent-type <Type>] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
