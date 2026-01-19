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
    reason: { type: "string" },
    severity: { type: "string" },
    target: { type: "string" },
    "requested-by": { type: "string" },
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

if (!values.context || !values["session-id"] || !values.reason) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const sessionId = requireMatch(values["session-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "session-id", "a safe path segment (letters, digits, '_' or '-')");
const reason = requireNonEmpty(values.reason, "reason");
const severity = normalizeSeverity(values.severity);
const target = normalizeOptional(values.target) ?? "human";
const requestedBy = normalizeOptional(values["requested-by"]);
const artifacts = parseSemicolonList(values.artifacts);
const notes = normalizeOptional(values.notes);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "Strategist";
const relatedDecisions = parseSemicolonList(values.decisions);

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

const escalationsDir = join(repoRoot, "runtime", "contexts", context, "escalations");
mkdirSync(escalationsDir, { recursive: true });

const nextIndex = resolveNextEscalationIndex(escalationsDir, sessionId);
const escalationId = `${sessionId}.${nextIndex}`;
const escalationPath = join(escalationsDir, `${escalationId}.escalation.md`);
if (existsSync(escalationPath)) {
  console.error(`Error: Escalation record already exists at ${escalationPath}`);
  process.exit(1);
}

const normalizedArtifacts = artifacts.map((entry) => normalizeArtifactRef(entry, repoRoot));
const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

const reportContent = renderEscalation({
  context,
  sessionId,
  escalationId,
  reason,
  severity,
  target,
  requestedBy,
  raisedAt: isoTimestamp,
  artifacts: normalizedArtifacts,
  notes,
});

await Bun.write(escalationPath, reportContent);

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Escalated session '${sessionId}' to ${target}.`,
  outputs: [toRepoRelative(escalationPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: sessionId,
  agentModel,
  agentType: undefined,
  timestampStart: values["timestamp-start"],
});

console.log(`Escalation recorded: ${escalationPath}`);

function renderEscalation(input: {
  context: string;
  sessionId: string;
  escalationId: string;
  reason: string;
  severity: string;
  target: string;
  requestedBy?: string;
  raisedAt: string;
  artifacts: string[];
  notes?: string;
}): string {
  const frontmatter = [
    "---",
    "type: U.EscalationRecord",
    "schema_version: \"0.1.0\"",
    "version: \"0.1.0\"",
    `context: ${JSON.stringify(input.context)}`,
    `session_id: ${JSON.stringify(input.sessionId)}`,
    `escalation_id: ${JSON.stringify(input.escalationId)}`,
    `status: \"open\"`,
    `severity: ${JSON.stringify(input.severity)}`,
    `target: ${JSON.stringify(input.target)}`,
    `raised_at: ${JSON.stringify(input.raisedAt)}`,
  ];
  if (input.requestedBy) {
    frontmatter.push(`requested_by: ${JSON.stringify(input.requestedBy)}`);
  }
  frontmatter.push(renderYamlKeyList("artifacts", input.artifacts));
  if (input.notes) {
    frontmatter.push(`notes: ${JSON.stringify(input.notes)}`);
  }
  frontmatter.push("---");

  const lines: string[] = [];
  lines.push(`# Escalation: ${input.escalationId}`);
  lines.push("");
  lines.push("## Reason");
  lines.push(input.reason);
  if (input.notes) {
    lines.push("");
    lines.push("## Notes");
    lines.push(input.notes);
  }
  lines.push("");

  return `${frontmatter.join("\n")}\n\n${lines.join("\n")}`;
}

function renderYamlKeyList(key: string, values: string[]): string {
  if (values.length === 0) {
    return `${key}: []`;
  }
  return `${key}:\n${values.map((value) => `  - ${JSON.stringify(value)}`).join("\n")}`;
}

function resolveNextEscalationIndex(dir: string, sessionId: string): number {
  const pattern = new RegExp(`^${escapeRegExp(sessionId)}\\.(\\d+)\\.escalation\\.md$`);
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

function normalizeSeverity(value?: string): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (trimmed.length === 0) {
    return "medium";
  }
  const allowed = new Set(["low", "medium", "high"]);
  if (!allowed.has(trimmed)) {
    console.error(`Invalid severity '${value ?? ""}'. Expected low, medium, or high.`);
    process.exit(1);
  }
  return trimmed;
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
    "workflow/escalate-to-human",
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
    "Usage: bun develop/skills/src/workflow/escalate-to-human/index.ts --context <Context> --session-id <Id> --reason \"...\" [--severity <low|medium|high>] [--target <Target>] [--requested-by <Label>] [--artifacts \"a; b\"] [--notes \"...\"] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
