#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { existsSync, readFileSync } from "node:fs";
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
    status: { type: "string" },
    summary: { type: "string" },
    "agent-type": { type: "string" },
    "agent-model": { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values["session-id"] || !values.status) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const sessionId = requireMatch(values["session-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "session-id", "a safe path segment (letters, digits, '_' or '-')");
const outcome = normalizeStatus(values.status);
const summary = normalizeOptional(values.summary) ?? "(no summary provided)";
const agentType = normalizeOptional(values["agent-type"]);
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

const content = readFileSync(sessionPath, "utf8");
const parsed = splitFrontmatter(content);
if (!parsed) {
  console.error(`Error: Session record missing front matter at ${sessionPath}`);
  process.exit(1);
}

const statusLine = parsed.frontmatter.find((line) => line.startsWith("status:"));
if (statusLine && statusLine.includes("completed")) {
  console.error("Error: Session record already completed.");
  process.exit(1);
}

const updatedFrontmatter = [...parsed.frontmatter];
upsertFrontmatterValue(updatedFrontmatter, "status", "completed");
upsertFrontmatterValue(updatedFrontmatter, "completed_at", isoTimestamp);
upsertFrontmatterValue(updatedFrontmatter, "outcome", outcome);
if (agentType) {
  upsertFrontmatterValue(updatedFrontmatter, "completed_by", agentType);
}
if (agentModel) {
  upsertFrontmatterValue(updatedFrontmatter, "completed_model", agentModel);
}

const completionSection = `## Completion\nStatus: ${outcome}\nCompleted at: ${isoTimestamp}\n\n${summary}\n`;
const updatedBody = `${parsed.body.trimEnd()}\n\n${completionSection}`;
const updatedContent = [`---`, ...updatedFrontmatter, `---`, "", updatedBody].join("\n");

await Bun.write(sessionPath, updatedContent);

const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Completed agent session '${sessionId}' with status '${outcome}'.`,
  outputs: [toRepoRelative(sessionPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: sessionId,
  agentModel,
  agentType,
  timestampStart: values["timestamp-start"],
});

console.log(`Session completed: ${sessionPath}`);

function splitFrontmatter(text: string): { frontmatter: string[]; body: string } | null {
  if (!text.startsWith("---\n")) {
    return null;
  }
  const endIndex = text.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return null;
  }
  const frontmatterBlock = text.slice(4, endIndex);
  const body = text.slice(endIndex + 5);
  const lines = frontmatterBlock.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return { frontmatter: lines, body };
}

function upsertFrontmatterValue(lines: string[], key: string, value: string): void {
  const rendered = `${key}: ${JSON.stringify(value)}`;
  const index = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (index >= 0) {
    lines[index] = rendered;
    return;
  }
  lines.push(rendered);
}

function normalizeStatus(value?: string): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  const allowed = new Set(["success", "needs-review", "blocked", "failed"]);
  if (!allowed.has(trimmed)) {
    console.error(`Invalid status '${value ?? ""}'. Expected success, needs-review, blocked, or failed.`);
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
    "governance/complete-agent-session",
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
    "Usage: bun develop/skills/src/governance/complete-agent-session/index.ts --context <Context> --session-id <Id> --status <success|needs-review|blocked|failed> [--summary \"...\"] [--agent-type <Type>] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
