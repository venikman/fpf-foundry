#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
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
    "session-id": { type: "string" },
    "from-agent-type": { type: "string" },
    "to-agent-type": { type: "string" },
    instructions: { type: "string" },
    "acceptance-criteria": { type: "string" },
    constraints: { type: "string" },
    artifacts: { type: "string" },
    notes: { type: "string" },
    "agent-model": { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values["session-id"] || !values["to-agent-type"]) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const sessionId = requireMatch(values["session-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "session-id", "a safe path segment (letters, digits, '_' or '-')");
const fromAgentType = normalizeOptional(values["from-agent-type"]) ?? "strategist";
const toAgentType = requireMatch(values["to-agent-type"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "to-agent-type", "a safe path segment (letters, digits, '_' or '-')");
const instructions = parseSemicolonList(values.instructions);
const acceptanceCriteria = parseSemicolonList(values["acceptance-criteria"]);
const constraints = parseSemicolonList(values.constraints);
const artifacts = parseSemicolonList(values.artifacts);
const notes = normalizeOptional(values.notes);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "Strategist";
const relatedDecisions = parseSemicolonList(values.decisions);

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

const sessionPath = join(repoRoot, "runtime", "contexts", context, "sessions", `${sessionId}.session.md`);
if (!existsSync(sessionPath)) {
  console.error(`Error: Session record not found at ${sessionPath}`);
  process.exit(1);
}

const handoffsDir = join(repoRoot, "runtime", "contexts", context, "handoffs");
mkdirSync(handoffsDir, { recursive: true });

const nextIndex = resolveNextHandoffIndex(handoffsDir, sessionId, toAgentType);
const handoffId = `${sessionId}.${toAgentType}.${nextIndex}`;
const handoffFilename = `${handoffId}.handoff.yaml`;
const handoffPath = join(handoffsDir, handoffFilename);
if (existsSync(handoffPath)) {
  console.error(`Error: Handoff record already exists at ${handoffPath}`);
  process.exit(1);
}

const normalizedArtifacts = artifacts.map((entry) => normalizeArtifactRef(entry, repoRoot));
const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

const yaml = renderHandoffYaml({
  sessionId,
  context,
  handoffId,
  fromAgentType,
  toAgentType,
  issuedAt: isoTimestamp,
  instructions,
  acceptanceCriteria,
  constraints,
  artifacts: normalizedArtifacts,
  notes,
});

await Bun.write(handoffPath, yaml);

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Issued handoff '${handoffId}' to ${toAgentType}.`,
  outputs: [toRepoRelative(handoffPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: sessionId,
  agentModel,
  agentType: fromAgentType,
  timestampStart: values["timestamp-start"],
});

console.log(`Handoff recorded: ${handoffPath}`);

function renderHandoffYaml(input: {
  sessionId: string;
  context: string;
  handoffId: string;
  fromAgentType: string;
  toAgentType: string;
  issuedAt: string;
  instructions: string[];
  acceptanceCriteria: string[];
  constraints: string[];
  artifacts: string[];
  notes?: string;
}): string {
  const lines = [
    `schema_version: "0.1.0"`,
    `type: U.AgentHandoff`,
    `version: "0.1.0"`,
    `context: ${JSON.stringify(input.context)}`,
    `session_id: ${JSON.stringify(input.sessionId)}`,
    `handoff_id: ${JSON.stringify(input.handoffId)}`,
    `from_agent_type: ${JSON.stringify(input.fromAgentType)}`,
    `to_agent_type: ${JSON.stringify(input.toAgentType)}`,
    `issued_at: ${JSON.stringify(input.issuedAt)}`,
    renderYamlKeyList("instructions", input.instructions),
    renderYamlKeyList("acceptance_criteria", input.acceptanceCriteria),
    renderYamlKeyList("constraints", input.constraints),
    renderYamlKeyList("artifacts", input.artifacts),
  ];
  if (input.notes) {
    lines.push(`notes: ${JSON.stringify(input.notes)}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderYamlKeyList(key: string, values: string[]): string {
  if (values.length === 0) {
    return `${key}: []`;
  }
  return `${key}:\n${values.map((value) => `  - ${JSON.stringify(value)}`).join("\n")}`;
}

function resolveNextHandoffIndex(dir: string, sessionId: string, toAgentType: string): number {
  const pattern = new RegExp(`^${escapeRegExp(sessionId)}\\.${escapeRegExp(toAgentType)}\\.(\\d+)\\.handoff\\.yaml$`);
  let maxIndex = 0;
  if (!existsSync(dir)) {
    return 1;
  }
  for (const entry of readdirSync(dir)) {
    const match = entry.match(pattern);
    if (!match) continue;
    const value = Number.parseInt(match[1] ?? "0", 10);
    if (value > maxIndex) {
      maxIndex = value;
    }
  }
  return maxIndex + 1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    "governance/handoff-to-agent",
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

function normalizeArtifactRef(value: string, repoRoot: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;

  const absolute = isAbsolute(trimmed) ? trimmed : resolve(repoRoot, trimmed);
  const rel = relative(repoRoot, absolute);
  const isOutsideRoot = isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`);
  if (!isOutsideRoot) {
    return toRepoRelative(absolute, repoRoot);
  }

  return trimmed;
}

function toRepoRelative(filePath: string, rootDir = process.cwd()): string {
  const rel = relative(rootDir, filePath);
  return rel.length === 0 ? "." : rel.split("\\").join("/");
}

function requireMatch(value: string | undefined, pattern: RegExp, name: string, description: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0 || !pattern.test(trimmed)) {
    console.error(`Invalid ${name} '${value ?? ""}'. Expected ${description}.`);
    process.exit(1);
  }
  return trimmed;
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
    "Usage: bun develop/skills/src/governance/handoff-to-agent/index.ts --context <Context> --session-id <Id> --to-agent-type <Type> [--from-agent-type <Type>] [--instructions \"a; b\"] [--acceptance-criteria \"a; b\"] [--constraints \"a; b\"] [--artifacts \"a; b\"] [--notes \"...\"] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
