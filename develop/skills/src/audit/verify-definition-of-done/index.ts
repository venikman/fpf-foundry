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
    "required-artifacts": { type: "string" },
    "allow-empty-diff": { type: "string" },
    "test-command": { type: "string" },
    "check-command": { type: "string" },
    "agent-type": { type: "string" },
    "agent-model": { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values["session-id"]) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const sessionId = requireMatch(values["session-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "session-id", "a safe path segment (letters, digits, '_' or '-')");

const allowEmptyDiff = parseBoolean(values["allow-empty-diff"], "allow-empty-diff");
const testCommand = normalizeOptional(values["test-command"]) ?? "bun test";
const checkCommand = normalizeOptional(values["check-command"]) ?? "bun packages/fpf/bin/fpf check";
const agentType = normalizeOptional(values["agent-type"]);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "ProxyAuditor";
const relatedDecisions = parseSemicolonList(values.decisions);

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();
const timestampSlug = isoTimestamp.replace(/[:.]/g, "-");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

const auditsDir = join(repoRoot, "runtime", "contexts", context, "audits", "dod");
mkdirSync(auditsDir, { recursive: true });

const reportPath = join(auditsDir, `${sessionId}.${timestampSlug}.dod.md`);
if (existsSync(reportPath)) {
  console.error(`Error: DoD report already exists at ${reportPath}`);
  process.exit(1);
}

const sessionPath = join(repoRoot, "runtime", "contexts", context, "sessions", `${sessionId}.session.md`);
const requiredArtifacts = buildRequiredArtifacts([sessionPath, ...parseSemicolonList(values["required-artifacts"])], repoRoot);
const missingArtifacts = requiredArtifacts.filter((artifact) => !artifact.exists).map((artifact) => artifact.normalized);

const diffCheck = evaluateDiffCheck(repoRoot, allowEmptyDiff);
const testCheck = runCommand(testCommand, repoRoot, "test-command");
const checkCheck = runCommand(checkCommand, repoRoot, "check-command");

const testStatus = testCheck.exitCode === 0 ? "pass" : "fail";
const checkStatus = checkCheck.exitCode === 0 ? "pass" : "fail";

const overallStatus =
  diffCheck.status === "fail" || testStatus === "fail" || checkStatus === "fail" || missingArtifacts.length > 0 ? "fail" : "pass";

const reportContent = renderReport({
  context,
  sessionId,
  status: overallStatus,
  checkedAt: isoTimestamp,
  allowEmptyDiff,
  diffStatus: diffCheck.status,
  diffSummary: diffCheck.summary,
  testStatus,
  testCommand,
  testSummary: summarizeCommand(testCheck),
  checkStatus,
  checkCommand,
  checkSummary: summarizeCommand(checkCheck),
  requiredArtifacts: requiredArtifacts.map((artifact) => artifact.normalized),
  missingArtifacts,
});

await Bun.write(reportPath, reportContent);

const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Verified Definition of Done for session '${sessionId}' (${overallStatus}).`,
  outputs: [toRepoRelative(reportPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: sessionId,
  agentModel,
  agentType,
  timestampStart: values["timestamp-start"],
});

if (overallStatus !== "pass") {
  console.error(`DoD verification failed: ${reportPath}`);
  process.exit(1);
}

console.log(`DoD report generated: ${reportPath}`);

type ArtifactCheck = {
  absolute: string;
  normalized: string;
  exists: boolean;
};

type CommandResult = {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
};

type DiffCheck = {
  status: "pass" | "fail" | "skipped";
  summary: string;
};

function buildRequiredArtifacts(entries: string[], repoRootDir: string): ArtifactCheck[] {
  const seen = new Map<string, ArtifactCheck>();
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    const absolute = isAbsolute(trimmed) ? trimmed : resolve(repoRootDir, trimmed);
    if (seen.has(absolute)) continue;
    const normalized = normalizeArtifactRef(absolute, repoRootDir);
    const exists = existsSync(absolute);
    seen.set(absolute, { absolute, normalized, exists });
  }
  return Array.from(seen.values());
}

function evaluateDiffCheck(repoRootDir: string, allowEmpty: boolean): DiffCheck {
  if (allowEmpty) {
    return { status: "skipped", summary: "diff check skipped" };
  }
  const result = runCommand("git status --porcelain", repoRootDir, "git status");
  if (result.exitCode !== 0) {
    return { status: "fail", summary: `git status failed (exit ${result.exitCode})` };
  }
  const lines = result.stdout.trim().length === 0 ? [] : result.stdout.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return { status: "fail", summary: "no changes detected" };
  }
  return { status: "pass", summary: `${lines.length} change(s) detected` };
}

function runCommand(command: string, cwd: string, label: string): CommandResult {
  const cmd = splitCommandLine(command, label);
  const proc = Bun.spawnSync({ cmd, cwd, stdout: "pipe", stderr: "pipe" });
  const stdoutText = proc.stdout ? new TextDecoder().decode(proc.stdout) : "";
  const stderrText = proc.stderr ? new TextDecoder().decode(proc.stderr) : "";
  return {
    command,
    exitCode: proc.exitCode,
    stdout: stdoutText,
    stderr: stderrText,
  };
}

function summarizeCommand(result: CommandResult): string {
  if (result.exitCode === 0) {
    return "pass";
  }
  return `fail (exit ${result.exitCode})`;
}

function renderReport(input: {
  context: string;
  sessionId: string;
  status: "pass" | "fail";
  checkedAt: string;
  allowEmptyDiff: boolean;
  diffStatus: string;
  diffSummary: string;
  testStatus: string;
  testCommand: string;
  testSummary: string;
  checkStatus: string;
  checkCommand: string;
  checkSummary: string;
  requiredArtifacts: string[];
  missingArtifacts: string[];
}): string {
  const frontmatter = [
    "---",
    "type: U.DoDReport",
    "schema_version: \"0.1.0\"",
    "version: \"0.1.0\"",
    `context: ${JSON.stringify(input.context)}`,
    `session_id: ${JSON.stringify(input.sessionId)}`,
    `status: ${JSON.stringify(input.status)}`,
    `checked_at: ${JSON.stringify(input.checkedAt)}`,
    `allow_empty_diff: ${JSON.stringify(input.allowEmptyDiff)}`,
    `diff_status: ${JSON.stringify(input.diffStatus)}`,
    `test_status: ${JSON.stringify(input.testStatus)}`,
    `check_status: ${JSON.stringify(input.checkStatus)}`,
    `test_command: ${JSON.stringify(input.testCommand)}`,
    `check_command: ${JSON.stringify(input.checkCommand)}`,
    renderYamlKeyList("required_artifacts", input.requiredArtifacts),
    renderYamlKeyList("missing_artifacts", input.missingArtifacts),
    "---",
  ];

  const lines: string[] = [];
  lines.push(`# Definition of Done Report: ${input.sessionId}`);
  lines.push("");
  lines.push("## Status");
  lines.push(input.status === "pass" ? "Pass" : "Fail");
  lines.push("");
  lines.push("## Checks");
  lines.push(`- Git diff: ${input.diffStatus} (${input.diffSummary})`);
  lines.push(`- Tests: ${input.testSummary} (${input.testCommand})`);
  lines.push(`- FPF check: ${input.checkSummary} (${input.checkCommand})`);
  lines.push("");
  lines.push("## Required Artifacts");
  lines.push(...renderListBlock(input.requiredArtifacts));
  lines.push("");
  lines.push("## Missing Artifacts");
  lines.push(...renderListBlock(input.missingArtifacts));
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

function splitCommandLine(command: string, label: string): string[] {
  const trimmed = command.trim();
  if (trimmed.length === 0) {
    console.error(`Missing ${label}.`);
    process.exit(1);
  }
  return trimmed.split(/\s+/).filter((entry) => entry.length > 0);
}

function parseBoolean(value: string | undefined, label: string): boolean {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    return false;
  }
  const normalized = trimmed.toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }
  console.error(`Invalid ${label} '${value ?? ""}'. Expected true or false.`);
  process.exit(1);
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
    "audit/verify-definition-of-done",
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
    "Usage: bun develop/skills/src/audit/verify-definition-of-done/index.ts --context <Context> --session-id <Id> [--required-artifacts \"a; b\"] [--allow-empty-diff <true|false>] [--test-command \"...\"] [--check-command \"...\"] [--agent-type <Type>] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
