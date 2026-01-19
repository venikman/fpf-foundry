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
    verdict: { type: "string" },
    findings: { type: "string" },
    recommendations: { type: "string" },
    artifacts: { type: "string" },
    "dod-report": { type: "string" },
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

if (!values.context || !values["session-id"] || !values.verdict) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const sessionId = requireMatch(values["session-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "session-id", "a safe path segment (letters, digits, '_' or '-')");
const verdict = normalizeVerdict(values.verdict);

const findings = parseSemicolonList(values.findings);
const recommendations = parseSemicolonList(values.recommendations);
const artifacts = parseSemicolonList(values.artifacts);
const notes = normalizeOptional(values.notes);
const agentType = normalizeOptional(values["agent-type"]);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "ProxyAuditor";
const relatedDecisions = parseSemicolonList(values.decisions);

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();
const timestampSlug = isoTimestamp.replace(/[:.]/g, "-");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

const auditsDir = join(repoRoot, "runtime", "contexts", context, "audits", "proxy");
mkdirSync(auditsDir, { recursive: true });

const reportPath = join(auditsDir, `${sessionId}.${timestampSlug}.proxy-audit.md`);
if (existsSync(reportPath)) {
  console.error(`Error: Proxy audit report already exists at ${reportPath}`);
  process.exit(1);
}

const dodReportInput = normalizeOptional(values["dod-report"]);
const dodReportAbsolute = dodReportInput ? resolvePath(dodReportInput, repoRoot) : undefined;
if (dodReportAbsolute && !existsSync(dodReportAbsolute)) {
  console.error(`Error: DoD report not found at ${dodReportAbsolute}`);
  process.exit(1);
}

const normalizedArtifacts = artifacts.map((entry) => normalizeArtifactRef(entry, repoRoot));
const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));
const normalizedDodReport = dodReportAbsolute ? normalizeArtifactRef(dodReportAbsolute, repoRoot) : undefined;

const reportContent = renderReport({
  context,
  sessionId,
  verdict,
  auditedAt: isoTimestamp,
  findings,
  recommendations,
  artifacts: normalizedArtifacts,
  dodReport: normalizedDodReport,
  notes,
});

await Bun.write(reportPath, reportContent);

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Issued proxy audit '${verdict}' for session '${sessionId}'.`,
  outputs: [toRepoRelative(reportPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: sessionId,
  agentModel,
  agentType,
  timestampStart: values["timestamp-start"],
});

console.log(`Proxy audit recorded: ${reportPath}`);

function renderReport(input: {
  context: string;
  sessionId: string;
  verdict: string;
  auditedAt: string;
  findings: string[];
  recommendations: string[];
  artifacts: string[];
  dodReport?: string;
  notes?: string;
}): string {
  const frontmatter = [
    "---",
    "type: U.ProxyAuditReport",
    "schema_version: \"0.1.0\"",
    "version: \"0.1.0\"",
    `context: ${JSON.stringify(input.context)}`,
    `session_id: ${JSON.stringify(input.sessionId)}`,
    `verdict: ${JSON.stringify(input.verdict)}`,
    `audited_at: ${JSON.stringify(input.auditedAt)}`,
    renderYamlKeyList("findings", input.findings),
    renderYamlKeyList("recommendations", input.recommendations),
    renderYamlKeyList("artifacts", input.artifacts),
  ];
  if (input.dodReport) {
    frontmatter.push(`dod_report: ${JSON.stringify(input.dodReport)}`);
  }
  if (input.notes) {
    frontmatter.push(`notes: ${JSON.stringify(input.notes)}`);
  }
  frontmatter.push("---");

  const lines: string[] = [];
  lines.push(`# Proxy Audit Report: ${input.sessionId}`);
  lines.push("");
  lines.push("## Verdict");
  lines.push(input.verdict);
  lines.push("");
  lines.push("## Findings");
  lines.push(...renderListBlock(input.findings));
  lines.push("");
  lines.push("## Recommendations");
  lines.push(...renderListBlock(input.recommendations));
  lines.push("");
  lines.push("## Artifacts");
  lines.push(...renderListBlock(input.artifacts));
  if (input.dodReport) {
    lines.push("");
    lines.push("## DoD Report");
    lines.push(input.dodReport);
  }
  if (input.notes) {
    lines.push("");
    lines.push("## Notes");
    lines.push(input.notes);
  }
  lines.push("");

  return `${frontmatter.join("\n")}\n\n${lines.join("\n")}`;
}

function renderListBlock(entries: string[]): string[] {
  if (entries.length === 0) {
    return ["- (none)"];
  }
  return entries.map((entry) => `- ${entry}`);
}

function renderYamlKeyList(key: string, values: string[]): string {
  if (values.length === 0) {
    return `${key}: []`;
  }
  return `${key}:\n${values.map((value) => `  - ${JSON.stringify(value)}`).join("\n")}`;
}

function normalizeVerdict(value: string | undefined): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  const allowed = new Set(["pass", "needs-review", "fail"]);
  if (!allowed.has(trimmed)) {
    console.error(`Invalid verdict '${value ?? ""}'. Expected pass, needs-review, or fail.`);
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
    "audit/proxy-audit-session",
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

function resolvePath(value: string, repoRootDir: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    console.error("Missing dod-report.");
    process.exit(1);
  }
  return isAbsolute(trimmed) ? trimmed : resolve(repoRootDir, trimmed);
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
    "Usage: bun develop/skills/src/audit/proxy-audit-session/index.ts --context <Context> --session-id <Id> --verdict <pass|needs-review|fail> [--findings \"a; b\"] [--recommendations \"a; b\"] [--artifacts \"a; b\"] [--dod-report <Path>] [--notes \"...\"] [--agent-type <Type>] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
