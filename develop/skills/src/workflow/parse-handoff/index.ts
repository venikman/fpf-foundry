#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSemicolonList, sortKeys, stableStringify } from "../../_shared/utils";

const args = Bun.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    "handoff-path": { type: "string" },
    "output-path": { type: "string" },
    "agent-type": { type: "string" },
    "agent-model": { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values["handoff-path"]) {
  printUsage();
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);
const handoffPath = resolvePath(values["handoff-path"], repoRoot);

if (!existsSync(handoffPath)) {
  console.error(`Error: Handoff file not found at ${handoffPath}`);
  process.exit(1);
}

const yamlText = readFileSync(handoffPath, "utf8");
const parsed = parseHandoffYaml(yamlText, handoffPath);
const validated = validateHandoff(parsed);

const outputPath = resolveOutputPath(values["output-path"], repoRoot, validated.context, validated.handoff_id);
if (existsSync(outputPath)) {
  console.error(`Error: Parsed handoff already exists at ${outputPath}`);
  process.exit(1);
}

const serialized = stableStringify(sortKeys(validated));
await Bun.write(outputPath, serialized);

const agentType = normalizeOptional(values["agent-type"]);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "ProxyAuditor";
const relatedDecisions = parseSemicolonList(values.decisions);
const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

logWork({
  repoRoot,
  context: validated.context,
  roleAssignment,
  action: `Parsed handoff '${validated.handoff_id}'.`,
  outputs: [toRepoRelative(outputPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: validated.session_id,
  agentModel,
  agentType,
  timestampStart: values["timestamp-start"],
});

console.log(`Handoff parsed: ${outputPath}`);

type HandoffData = {
  schema_version: string;
  type: string;
  version: string;
  context: string;
  session_id: string;
  handoff_id: string;
  from_agent_type: string;
  to_agent_type: string;
  issued_at: string;
  instructions: string[];
  acceptance_criteria: string[];
  constraints: string[];
  prohibited_actions?: string[];
  artifacts: string[];
  notes?: string;
  [key: string]: unknown;
};

function parseHandoffYaml(text: string, sourceName: string): Record<string, unknown> {
  const lines = text.split(/\r?\n/);
  const result: Record<string, unknown> = {};
  let pendingKey: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const stripped = stripComments(rawLine).trimEnd();
    if (stripped.trim().length === 0) {
      continue;
    }

    const indent = countIndent(stripped);
    const content = stripped.trimStart();
    if (content.startsWith("-")) {
      if (!pendingKey) {
        throw new Error(`${sourceName}:${i + 1} list item without a key`);
      }
      const value = content === "-" ? "" : content.slice(1).trimStart();
      const list = result[pendingKey];
      if (!Array.isArray(list)) {
        result[pendingKey] = [];
      }
      (result[pendingKey] as string[]).push(parseScalar(value));
      continue;
    }

    if (indent !== 0) {
      throw new Error(`${sourceName}:${i + 1} unexpected indentation`);
    }

    const match = content.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
    if (!match) {
      throw new Error(`${sourceName}:${i + 1} invalid mapping entry`);
    }

    const key = match[1] ?? "";
    const value = match[2];

    if (Object.prototype.hasOwnProperty.call(result, key)) {
      throw new Error(`${sourceName}:${i + 1} duplicate key '${key}'`);
    }

    if (value === undefined) {
      result[key] = null;
      pendingKey = key;
      continue;
    }

    pendingKey = null;
    if (value.trim() === "[]") {
      result[key] = [];
      continue;
    }

    result[key] = parseScalar(value.trim());
  }

  return result;
}

function validateHandoff(input: Record<string, unknown>): HandoffData {
  const allowedKeys = new Set([
    "schema_version",
    "type",
    "version",
    "context",
    "session_id",
    "handoff_id",
    "from_agent_type",
    "to_agent_type",
    "issued_at",
    "instructions",
    "acceptance_criteria",
    "constraints",
    "prohibited_actions",
    "artifacts",
    "notes",
  ]);

  const extensions: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (allowedKeys.has(key)) {
      continue;
    }
    if (key.startsWith("x-")) {
      extensions[key] = input[key];
      continue;
    }
    throw new Error(`Unknown key '${key}'. Use x-* extensions for custom fields.`);
  }

  const schemaVersion = requireString(input.schema_version, "schema_version");
  const type = requireString(input.type, "type");
  const version = requireString(input.version, "version");
  if (schemaVersion !== "0.1.0") {
    throw new Error(`Unsupported schema_version '${schemaVersion}'. Expected 0.1.0.`);
  }
  if (version !== "0.1.0") {
    throw new Error(`Unsupported version '${version}'. Expected 0.1.0.`);
  }
  if (type !== "U.AgentHandoff") {
    throw new Error(`Invalid type '${type}'. Expected U.AgentHandoff.`);
  }

  const context = requireString(input.context, "context");
  const sessionId = requireString(input.session_id, "session_id");
  const handoffId = requireString(input.handoff_id, "handoff_id");
  const fromAgentType = requireString(input.from_agent_type, "from_agent_type");
  const toAgentType = requireString(input.to_agent_type, "to_agent_type");
  const issuedAt = requireString(input.issued_at, "issued_at");

  validateAgentType(fromAgentType, "from_agent_type");
  validateAgentType(toAgentType, "to_agent_type");
  validateIsoTimestamp(issuedAt, "issued_at");

  const instructions = requireStringArray(input.instructions, "instructions");
  const acceptanceCriteria = requireStringArray(input.acceptance_criteria, "acceptance_criteria");
  const constraints = requireStringArray(input.constraints, "constraints");
  const artifacts = requireStringArray(input.artifacts, "artifacts");

  const prohibitedActions = input.prohibited_actions === undefined ? undefined : requireStringArray(input.prohibited_actions, "prohibited_actions");
  const notes = input.notes === undefined ? undefined : requireString(input.notes, "notes");

  const output: HandoffData = {
    schema_version: schemaVersion,
    type,
    version,
    context,
    session_id: sessionId,
    handoff_id: handoffId,
    from_agent_type: fromAgentType,
    to_agent_type: toAgentType,
    issued_at: issuedAt,
    instructions,
    acceptance_criteria: acceptanceCriteria,
    constraints,
    artifacts,
    ...(prohibitedActions ? { prohibited_actions: prohibitedActions } : {}),
    ...(notes ? { notes } : {}),
  };

  if (Object.keys(extensions).length > 0) {
    Object.assign(output, extensions);
  }

  return output;
}

function validateAgentType(value: string, label: string): void {
  const allowed = new Set(["strategist", "executor", "proxy-auditor", "human"]);
  if (!allowed.has(value)) {
    throw new Error(`Invalid ${label} '${value}'. Expected one of strategist, executor, proxy-auditor, human.`);
  }
}

function validateIsoTimestamp(value: string, label: string): void {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label} '${value}'. Expected an ISO-8601 date-time.`);
  }
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing or invalid ${label}.`);
  }
  return value.trim();
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${label}. Expected a list of strings.`);
  }
  const entries = value.map((entry) => {
    if (typeof entry !== "string") {
      throw new Error(`Invalid ${label} entry. Expected string values.`);
    }
    return entry.trim();
  });
  return entries;
}

function countIndent(line: string): number {
  let indent = 0;
  for (const char of line) {
    if (char === " ") {
      indent += 1;
      continue;
    }
    if (char === "\t") {
      return indent;
    }
    break;
  }
  return indent;
}

function parseScalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function stripComments(value: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "'" && !inDouble) {
      if (inSingle && value[i + 1] === "'") {
        i += 1;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (char === "\"" && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (char === "#" && !inSingle && !inDouble) {
      return value.slice(0, i);
    }
  }
  return value;
}

function resolvePath(value: string, repoRootDir: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    console.error("Missing handoff_path.");
    process.exit(1);
  }
  return isAbsolute(trimmed) ? trimmed : resolve(repoRootDir, trimmed);
}

function resolveOutputPath(value: string | undefined, repoRootDir: string, context: string, handoffId: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length > 0) {
    return isAbsolute(trimmed) ? trimmed : resolve(repoRootDir, trimmed);
  }
  const dir = join(repoRootDir, "runtime", "contexts", context, "handoffs");
  return join(dir, `${handoffId}.parsed.json`);
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
    "workflow/parse-handoff",
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
    "Usage: bun develop/skills/src/workflow/parse-handoff/index.ts --handoff-path <Path> [--output-path <Path>] [--agent-type <Type>] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
