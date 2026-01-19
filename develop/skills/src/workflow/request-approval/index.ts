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
    "approval-id": { type: "string" },
    summary: { type: "string" },
    details: { type: "string" },
    "required-for": { type: "string" },
    "approver-role": { type: "string" },
    "requested-by": { type: "string" },
    "due-by": { type: "string" },
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

if (!values.context || !values["session-id"] || !values["approval-id"] || !values.summary) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const sessionId = requireMatch(values["session-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "session-id", "a safe path segment (letters, digits, '_' or '-')");
const approvalId = requireMatch(values["approval-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "approval-id", "a safe path segment (letters, digits, '_' or '-')");
const summary = requireNonEmpty(values.summary, "summary");
const details = normalizeOptional(values.details);
const requiredFor = parseSemicolonList(values["required-for"]);
const approverRole = normalizeOptional(values["approver-role"]);
const requestedBy = normalizeOptional(values["requested-by"]);
const dueBy = normalizeOptional(values["due-by"]);
const artifacts = parseSemicolonList(values.artifacts);
const notes = normalizeOptional(values.notes);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "Strategist";
const relatedDecisions = parseSemicolonList(values.decisions);

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

const approvalsDir = join(repoRoot, "runtime", "contexts", context, "approvals");
mkdirSync(approvalsDir, { recursive: true });

const approvalPath = join(approvalsDir, `${sessionId}.${approvalId}.approval.md`);
if (existsSync(approvalPath)) {
  console.error(`Error: Approval request already exists at ${approvalPath}`);
  process.exit(1);
}

const normalizedArtifacts = artifacts.map((entry) => normalizeArtifactRef(entry, repoRoot));
const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

const requestContent = renderRequest({
  context,
  sessionId,
  approvalId,
  summary,
  details,
  requiredFor,
  approverRole,
  requestedBy,
  dueBy,
  requestedAt: isoTimestamp,
  artifacts: normalizedArtifacts,
  notes,
});

await Bun.write(approvalPath, requestContent);

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Requested approval '${approvalId}' for session '${sessionId}'.`,
  outputs: [toRepoRelative(approvalPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: sessionId,
  agentModel,
  agentType: undefined,
  timestampStart: values["timestamp-start"],
});

console.log(`Approval request recorded: ${approvalPath}`);

function renderRequest(input: {
  context: string;
  sessionId: string;
  approvalId: string;
  summary: string;
  details?: string;
  requiredFor: string[];
  approverRole?: string;
  requestedBy?: string;
  dueBy?: string;
  requestedAt: string;
  artifacts: string[];
  notes?: string;
}): string {
  const frontmatter = [
    "---",
    "type: U.ApprovalRequest",
    "schema_version: \"0.1.0\"",
    "version: \"0.1.0\"",
    `context: ${JSON.stringify(input.context)}`,
    `session_id: ${JSON.stringify(input.sessionId)}`,
    `approval_id: ${JSON.stringify(input.approvalId)}`,
    `status: \"pending\"`,
    `requested_at: ${JSON.stringify(input.requestedAt)}`,
  ];
  if (input.requestedBy) {
    frontmatter.push(`requested_by: ${JSON.stringify(input.requestedBy)}`);
  }
  if (input.approverRole) {
    frontmatter.push(`approver_role: ${JSON.stringify(input.approverRole)}`);
  }
  if (input.dueBy) {
    frontmatter.push(`due_by: ${JSON.stringify(input.dueBy)}`);
  }
  frontmatter.push(renderYamlKeyList("required_for", input.requiredFor));
  frontmatter.push(renderYamlKeyList("artifacts", input.artifacts));
  if (input.notes) {
    frontmatter.push(`notes: ${JSON.stringify(input.notes)}`);
  }
  frontmatter.push("---");

  const lines: string[] = [];
  lines.push(`# Approval Request: ${input.approvalId}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(input.summary);
  if (input.details) {
    lines.push("");
    lines.push("## Details");
    lines.push(input.details);
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
    "workflow/request-approval",
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
    "Usage: bun develop/skills/src/workflow/request-approval/index.ts --context <Context> --session-id <Id> --approval-id <Id> --summary \"...\" [--details \"...\"] [--required-for \"a; b\"] [--approver-role <Role>] [--requested-by <Label>] [--due-by <Date>] [--artifacts \"a; b\"] [--notes \"...\"] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
