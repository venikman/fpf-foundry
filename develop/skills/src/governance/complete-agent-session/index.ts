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
    "dod-report": { type: "string" },
    "roc-report": { type: "string" },
    "roc-path": { type: "string" },
    "used-tools": { type: "string" },
    approvals: { type: "string" },
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
const requestedOutcome = normalizeStatus(values.status);
let outcome = requestedOutcome;
const summary = normalizeOptional(values.summary) ?? "(no summary provided)";
const agentType = normalizeOptional(values["agent-type"]);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "Strategist";
const relatedDecisions = parseSemicolonList(values.decisions);
const dodReportInput = normalizeOptional(values["dod-report"]);
const rocReportInput = normalizeOptional(values["roc-report"]);
const rocPathInput = normalizeOptional(values["roc-path"]);
const usedTools = parseSemicolonList(values["used-tools"]);
const approvals = parseSemicolonList(values.approvals);

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

let dodStatus: string | undefined;
let dodReportRef: string | undefined;
let dodGateNote: string | undefined;
let rocStatus: string | undefined;
let rocOutcome: string | undefined;
let rocReportRef: string | undefined;
let rocGateNote: string | undefined;

if (dodReportInput) {
  const dodReportPath = resolvePath(dodReportInput, repoRoot);
  if (!existsSync(dodReportPath)) {
    console.error(`Error: DoD report not found at ${dodReportPath}`);
    process.exit(1);
  }
  const dodInfo = loadDodReport(dodReportPath);
  if (dodInfo.context !== context || dodInfo.sessionId !== sessionId) {
    console.error(`Error: DoD report does not match session ${sessionId} in ${context}.`);
    process.exit(1);
  }
  dodStatus = normalizeDodStatus(dodInfo.status);
  dodReportRef = normalizeArtifactRef(dodReportPath, repoRoot);
} else if (requestedOutcome === "success") {
  dodStatus = "missing";
}

if (requestedOutcome === "success" && dodStatus !== "pass") {
  outcome = "needs-review";
  const reason = dodStatus ? `DoD status ${dodStatus}` : "missing DoD report";
  dodGateNote = `DoD gate: ${reason}; forcing needs-review.`;
}

if (rocReportInput && rocPathInput) {
  console.error("Error: Provide either --roc-report or --roc-path, not both.");
  process.exit(1);
}

let resolvedRocReport = rocReportInput;
if (rocPathInput) {
  const rocPath = resolvePath(rocPathInput, repoRoot);
  resolvedRocReport = runRocCompliance({
    repoRoot,
    context,
    sessionId,
    rocPath,
    usedTools,
    approvals,
    timestampStart: values["timestamp-start"],
  });
}

if (resolvedRocReport) {
  const rocReportPath = resolvePath(resolvedRocReport, repoRoot);
  if (!existsSync(rocReportPath)) {
    console.error(`Error: RoC report not found at ${rocReportPath}`);
    process.exit(1);
  }
  const rocInfo = loadRocReport(rocReportPath);
  if (rocInfo.context !== context || rocInfo.sessionId !== sessionId) {
    console.error(`Error: RoC report does not match session ${sessionId} in ${context}.`);
    process.exit(1);
  }
  rocStatus = normalizeRocStatus(rocInfo.status);
  rocOutcome = normalizeRocOutcome(rocInfo.violationOutcome);
  rocReportRef = normalizeArtifactRef(rocReportPath, repoRoot);
  if (rocStatus === "violations") {
    const enforced = applyOutcomePolicy(outcome, rocOutcome);
    if (enforced !== outcome) {
      rocGateNote = `RoC gate: violations enforce ${rocOutcome}.`;
      outcome = enforced;
    }
  }
}

const summaryText = appendSummary(summary, [dodGateNote, rocGateNote]);

const updatedFrontmatter = [...parsed.frontmatter];
upsertFrontmatterValue(updatedFrontmatter, "status", "completed");
upsertFrontmatterValue(updatedFrontmatter, "completed_at", isoTimestamp);
upsertFrontmatterValue(updatedFrontmatter, "outcome", outcome);
if (dodReportRef) {
  upsertFrontmatterValue(updatedFrontmatter, "dod_report", dodReportRef);
}
if (dodStatus) {
  upsertFrontmatterValue(updatedFrontmatter, "dod_status", dodStatus);
}
if (rocReportRef) {
  upsertFrontmatterValue(updatedFrontmatter, "roc_report", rocReportRef);
}
if (rocStatus) {
  upsertFrontmatterValue(updatedFrontmatter, "roc_status", rocStatus);
}
if (rocOutcome && rocStatus === "violations") {
  upsertFrontmatterValue(updatedFrontmatter, "roc_outcome", rocOutcome);
}
if (agentType) {
  upsertFrontmatterValue(updatedFrontmatter, "completed_by", agentType);
}
if (agentModel) {
  upsertFrontmatterValue(updatedFrontmatter, "completed_model", agentModel);
}

const completionLines = ["## Completion", `Status: ${outcome}`, `Completed at: ${isoTimestamp}`];
if (dodStatus) {
  completionLines.push(`DoD status: ${dodStatus}`);
}
if (dodReportRef) {
  completionLines.push(`DoD report: ${dodReportRef}`);
}
if (rocStatus) {
  completionLines.push(`RoC status: ${rocStatus}`);
}
if (rocReportRef) {
  completionLines.push(`RoC report: ${rocReportRef}`);
}
if (rocOutcome && rocStatus === "violations") {
  completionLines.push(`RoC outcome: ${rocOutcome}`);
}
completionLines.push("", summaryText);
const completionSection = `${completionLines.join("\n")}\n`;
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

function resolvePath(value: string, repoRootDir: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    console.error("Missing dod-report.");
    process.exit(1);
  }
  return isAbsolute(trimmed) ? trimmed : resolve(repoRootDir, trimmed);
}

function loadDodReport(filePath: string): { context: string; sessionId: string; status: string } {
  const content = readFileSync(filePath, "utf8");
  const parsed = splitFrontmatter(content);
  if (!parsed) {
    console.error(`Error: DoD report missing front matter at ${filePath}`);
    process.exit(1);
  }
  const data = parseFrontmatterMap(parsed.frontmatter);
  const context = data.context ?? "";
  const sessionId = data.session_id ?? "";
  const status = data.status ?? "";
  if (!context || !sessionId || !status) {
    console.error(`Error: DoD report missing context, session_id, or status at ${filePath}`);
    process.exit(1);
  }
  return { context, sessionId, status };
}

function loadRocReport(filePath: string): { context: string; sessionId: string; status: string; violationOutcome: string } {
  const content = readFileSync(filePath, "utf8");
  const parsed = splitFrontmatter(content);
  if (!parsed) {
    console.error(`Error: RoC report missing front matter at ${filePath}`);
    process.exit(1);
  }
  const data = parseFrontmatterMap(parsed.frontmatter);
  const context = data.context ?? "";
  const sessionId = data.session_id ?? "";
  const status = data.status ?? "";
  const violationOutcome = data.violation_outcome ?? "";
  if (!context || !sessionId || !status || !violationOutcome) {
    console.error(`Error: RoC report missing context, session_id, status, or violation_outcome at ${filePath}`);
    process.exit(1);
  }
  return { context, sessionId, status, violationOutcome };
}

function parseFrontmatterMap(lines: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }
    const key = match[1] ?? "";
    const rawValue = (match[2] ?? "").trim();
    if (!key || rawValue.length === 0) {
      continue;
    }
    result[key] = parseScalar(rawValue);
  }
  return result;
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

function normalizeDodStatus(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const allowed = new Set(["pass", "fail"]);
  if (!allowed.has(trimmed)) {
    console.error(`Invalid DoD status '${value}'. Expected pass or fail.`);
    process.exit(1);
  }
  return trimmed;
}

function normalizeRocStatus(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const allowed = new Set(["pass", "violations"]);
  if (!allowed.has(trimmed)) {
    console.error(`Invalid RoC status '${value}'. Expected pass or violations.`);
    process.exit(1);
  }
  return trimmed;
}

function normalizeRocOutcome(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const allowed = new Set(["blocked", "needs-review"]);
  if (!allowed.has(trimmed)) {
    console.error(`Invalid RoC violation outcome '${value}'. Expected blocked or needs-review.`);
    process.exit(1);
  }
  return trimmed;
}

function applyOutcomePolicy(current: string, enforced: string): string {
  const severity: Record<string, number> = {
    success: 0,
    "needs-review": 1,
    blocked: 2,
    failed: 3,
  };
  const currentScore = severity[current] ?? 0;
  const enforcedScore = severity[enforced] ?? 0;
  return enforcedScore > currentScore ? enforced : current;
}

function appendSummary(summary: string, notes: Array<string | undefined>): string {
  const extra = notes.map((note) => (note ?? "").trim()).filter((note) => note.length > 0);
  if (extra.length === 0) {
    return summary;
  }
  return `${summary}\n\n${extra.join("\n\n")}`;
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

function runRocCompliance(input: {
  repoRoot: string;
  context: string;
  sessionId: string;
  rocPath: string;
  usedTools: string[];
  approvals: string[];
  timestampStart?: string;
}): string {
  const rocScript = join(input.repoRoot, "develop", "skills", "src", "governance", "check-roc-compliance", "index.ts");
  if (!existsSync(rocScript)) {
    console.error("Error: governance/check-roc-compliance skill not found.");
    process.exit(1);
  }

  const cmd = ["bun", rocScript, "--context", input.context, "--session-id", input.sessionId, "--roc-path", input.rocPath];
  if (input.usedTools.length > 0) {
    cmd.push("--used-tools", input.usedTools.join("; "));
  }
  if (input.approvals.length > 0) {
    cmd.push("--approvals", input.approvals.join("; "));
  }
  if (input.timestampStart && input.timestampStart.trim().length > 0) {
    cmd.push("--timestamp-start", input.timestampStart.trim());
  }

  const proc = Bun.spawnSync({ cmd, cwd: input.repoRoot, stdout: "pipe", stderr: "pipe" });
  const stdoutText = proc.stdout ? new TextDecoder().decode(proc.stdout) : "";
  const stderrText = proc.stderr ? new TextDecoder().decode(proc.stderr) : "";

  const outputText = `${stdoutText}\n${stderrText}`;
  const reportMatch =
    outputText.match(/RoC report generated: (.+)$/m) ?? outputText.match(/RoC compliance violations detected: (.+)$/m);

  if (!reportMatch || !reportMatch[1]) {
    console.error("Error: Unable to determine RoC report path from check-roc-compliance output.");
    if (stdoutText.trim().length > 0) {
      console.error("check-roc-compliance stdout:");
      console.error(stdoutText.trimEnd());
    }
    if (stderrText.trim().length > 0) {
      console.error("check-roc-compliance stderr:");
      console.error(stderrText.trimEnd());
    }
    process.exit(1);
  }

  return reportMatch[1].trim();
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
    "Usage: bun develop/skills/src/governance/complete-agent-session/index.ts --context <Context> --session-id <Id> --status <success|needs-review|blocked|failed> [--dod-report <Path>] [--roc-report <Path>] [--roc-path <Path>] [--used-tools \"a; b\"] [--approvals \"a; b\"] [--summary \"...\"] [--agent-type <Type>] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
