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
    "approval-id": { type: "string" },
    decision: { type: "string" },
    "responded-by": { type: "string" },
    notes: { type: "string" },
    "agent-model": { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values["session-id"] || !values["approval-id"] || !values.decision) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const sessionId = requireMatch(values["session-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "session-id", "a safe path segment (letters, digits, '_' or '-')");
const approvalId = requireMatch(values["approval-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "approval-id", "a safe path segment (letters, digits, '_' or '-')");
const decision = normalizeDecision(values.decision);
const respondedBy = normalizeOptional(values["responded-by"]);
const notes = normalizeOptional(values.notes);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "Strategist";
const relatedDecisions = parseSemicolonList(values.decisions);

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();
const timestampSlug = isoTimestamp.replace(/[:.]/g, "-");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

const approvalsDir = join(repoRoot, "runtime", "contexts", context, "approvals");
const requestPath = join(approvalsDir, `${sessionId}.${approvalId}.approval.md`);
if (!existsSync(requestPath)) {
  console.error(`Error: Approval request not found at ${requestPath}`);
  process.exit(1);
}

const responsePath = join(approvalsDir, `${sessionId}.${approvalId}.${timestampSlug}.response.md`);
if (existsSync(responsePath)) {
  console.error(`Error: Approval response already exists at ${responsePath}`);
  process.exit(1);
}

const responseContent = renderResponse({
  context,
  sessionId,
  approvalId,
  decision,
  respondedAt: isoTimestamp,
  respondedBy,
  notes,
});

await Bun.write(responsePath, responseContent);

const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Responded to approval '${approvalId}' with '${decision}'.`,
  outputs: [toRepoRelative(responsePath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: sessionId,
  agentModel,
  agentType: undefined,
  timestampStart: values["timestamp-start"],
});

console.log(`Approval response recorded: ${responsePath}`);

function renderResponse(input: {
  context: string;
  sessionId: string;
  approvalId: string;
  decision: string;
  respondedAt: string;
  respondedBy?: string;
  notes?: string;
}): string {
  const frontmatter = [
    "---",
    "type: U.ApprovalResponse",
    "schema_version: \"0.1.0\"",
    "version: \"0.1.0\"",
    `context: ${JSON.stringify(input.context)}`,
    `session_id: ${JSON.stringify(input.sessionId)}`,
    `approval_id: ${JSON.stringify(input.approvalId)}`,
    `decision: ${JSON.stringify(input.decision)}`,
    `responded_at: ${JSON.stringify(input.respondedAt)}`,
  ];
  if (input.respondedBy) {
    frontmatter.push(`responded_by: ${JSON.stringify(input.respondedBy)}`);
  }
  if (input.notes) {
    frontmatter.push(`notes: ${JSON.stringify(input.notes)}`);
  }
  frontmatter.push("---");

  const lines: string[] = [];
  lines.push(`# Approval Response: ${input.approvalId}`);
  lines.push("");
  lines.push("## Decision");
  lines.push(input.decision);
  if (input.notes) {
    lines.push("");
    lines.push("## Notes");
    lines.push(input.notes);
  }
  lines.push("");

  return `${frontmatter.join("\n")}\n\n${lines.join("\n")}`;
}

function normalizeDecision(value: string | undefined): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  const allowed = new Set(["approved", "denied", "needs-review"]);
  if (!allowed.has(trimmed)) {
    console.error(`Invalid decision '${value ?? ""}'. Expected approved, denied, or needs-review.`);
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
    "workflow/respond-to-approval",
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
    "Usage: bun develop/skills/src/workflow/respond-to-approval/index.ts --context <Context> --session-id <Id> --approval-id <Id> --decision <approved|denied|needs-review> [--responded-by <Label>] [--notes \"...\"] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
