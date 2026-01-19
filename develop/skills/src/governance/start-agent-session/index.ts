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
    "session-id": { type: "string" },
    title: { type: "string" },
    purpose: { type: "string" },
    "initiated-by": { type: "string" },
    "agent-type": { type: "string" },
    "agent-model": { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values["session-id"] || !values.title) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const sessionId = requireMatch(values["session-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "session-id", "a safe path segment (letters, digits, '_' or '-')");
const title = requireNonEmpty(values.title, "title");
const purpose = normalizeOptional(values.purpose) ?? "TBD";
const initiatedBy = normalizeOptional(values["initiated-by"]);
const agentType = normalizeOptional(values["agent-type"]);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "Strategist";
const relatedDecisions = parseSemicolonList(values.decisions);

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);
const sessionsDir = join(repoRoot, "runtime", "contexts", context, "sessions");
mkdirSync(sessionsDir, { recursive: true });

const sessionPath = join(sessionsDir, `${sessionId}.session.md`);
if (existsSync(sessionPath)) {
  console.error(`Error: Session record already exists at ${sessionPath}`);
  process.exit(1);
}

const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

const frontmatter = renderFrontmatter({
  sessionId,
  context,
  status: "active",
  startedAt: isoTimestamp,
  title,
  purpose,
  initiatedBy,
  agentType,
  agentModel,
  relatedDecisions: normalizedDecisions,
});

const body = `# Agent Session: ${sessionId}

## Title
${title}

## Purpose
${purpose}

## Initiated By
${initiatedBy ?? "(unspecified)"}

## Agent Type
${agentType ?? "(unspecified)"}
`;

await Bun.write(sessionPath, `${frontmatter}\n${body}`);

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Started agent session '${sessionId}': ${title}`,
  outputs: [toRepoRelative(sessionPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: sessionId,
  agentModel,
  agentType,
  timestampStart: values["timestamp-start"],
});

console.log(`Session started: ${sessionPath}`);

function renderFrontmatter(input: {
  sessionId: string;
  context: string;
  status: string;
  startedAt: string;
  title: string;
  purpose: string;
  initiatedBy?: string;
  agentType?: string;
  agentModel?: string;
  relatedDecisions: string[];
}): string {
  const lines = ["---"];
  lines.push(`type: U.AgentSession`);
  lines.push(`session_id: ${JSON.stringify(input.sessionId)}`);
  lines.push(`context: ${JSON.stringify(input.context)}`);
  lines.push(`status: ${JSON.stringify(input.status)}`);
  lines.push(`started_at: ${JSON.stringify(input.startedAt)}`);
  lines.push(`title: ${JSON.stringify(input.title)}`);
  lines.push(`purpose: ${JSON.stringify(input.purpose)}`);
  if (input.initiatedBy) {
    lines.push(`initiated_by: ${JSON.stringify(input.initiatedBy)}`);
  }
  if (input.agentType) {
    lines.push(`agent_type: ${JSON.stringify(input.agentType)}`);
  }
  if (input.agentModel) {
    lines.push(`agent_model: ${JSON.stringify(input.agentModel)}`);
  }
  lines.push(renderYamlKeyList("related_decisions", input.relatedDecisions));
  lines.push("---");
  return lines.join("\n");
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
    "governance/start-agent-session",
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
    "Usage: bun develop/skills/src/governance/start-agent-session/index.ts --context <Context> --session-id <Id> --title <Title> [--purpose \"...\"] [--initiated-by \"...\"] [--agent-type <Type>] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
