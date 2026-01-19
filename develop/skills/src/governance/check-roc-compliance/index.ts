#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
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
    "roc-path": { type: "string" },
    "used-tools": { type: "string" },
    approvals: { type: "string" },
    "agent-type": { type: "string" },
    "agent-model": { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values["session-id"] || !values["roc-path"]) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const sessionId = requireMatch(values["session-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "session-id", "a safe path segment (letters, digits, '_' or '-')");

const rocPath = resolvePath(values["roc-path"], process.cwd());
if (!existsSync(rocPath)) {
  console.error(`Error: RoC file not found at ${rocPath}`);
  process.exit(1);
}

const usedTools = parseSemicolonList(values["used-tools"]);
const approvals = parseSemicolonList(values.approvals);
const agentType = normalizeOptional(values["agent-type"]);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "ProxyAuditor";
const relatedDecisions = parseSemicolonList(values.decisions);

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();
const timestampSlug = isoTimestamp.replace(/[:.]/g, "-");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

let rocData: RocData;
try {
  rocData = loadRocDocument(rocPath);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: Failed to parse RoC file. ${message}`);
  process.exit(1);
}
if (rocData.context !== context) {
  console.error(`Error: RoC context mismatch. Expected ${context}.`);
  process.exit(1);
}

const compliance = evaluateCompliance({
  roc: rocData,
  usedTools,
  approvals,
});

const auditsDir = join(repoRoot, "runtime", "contexts", context, "audits", "roc");
mkdirSync(auditsDir, { recursive: true });
const reportPath = join(auditsDir, `${sessionId}.${timestampSlug}.roc.md`);
if (existsSync(reportPath)) {
  console.error(`Error: RoC report already exists at ${reportPath}`);
  process.exit(1);
}

const reportContent = renderReport({
  context,
  sessionId,
  rocId: rocData.rocId,
  rocPath: normalizeArtifactRef(rocPath, repoRoot),
  status: compliance.status,
  violationOutcome: compliance.violationOutcome,
  checkedAt: isoTimestamp,
  usedTools,
  missingApprovals: compliance.missingApprovals,
  violations: compliance.violations,
});

await Bun.write(reportPath, reportContent);

const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Checked RoC compliance for session '${sessionId}' (${compliance.status}).`,
  outputs: [toRepoRelative(reportPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: sessionId,
  agentModel,
  agentType,
  timestampStart: values["timestamp-start"],
});

if (compliance.status !== "pass") {
  console.error(`RoC compliance violations detected: ${reportPath}`);
  process.exit(1);
}

console.log(`RoC report generated: ${reportPath}`);

type RocData = {
  context: string;
  rocId: string;
  allowedTools: string[];
  forbiddenTools: string[];
  approvalsRequiredFor: string[];
  violationOutcome: string;
};

type ComplianceResult = {
  status: "pass" | "violations";
  violations: string[];
  missingApprovals: string[];
  violationOutcome: string;
};

function loadRocDocument(filePath: string): RocData {
  const text = readFileSync(filePath, "utf8");
  const data = parseYamlDocument(text, filePath);
  const schemaVersion = requireString(data.schema_version, "schema_version");
  const type = requireString(data.type, "type");
  const version = requireString(data.version, "version");
  if (schemaVersion !== "0.1.0") {
    throw new Error(`Unsupported schema_version '${schemaVersion}'. Expected 0.1.0.`);
  }
  if (version !== "0.1.0") {
    throw new Error(`Unsupported version '${version}'. Expected 0.1.0.`);
  }
  if (type !== "U.RuleOfConstraints") {
    throw new Error(`Invalid type '${type}'. Expected U.RuleOfConstraints.`);
  }

  const context = requireString(data.context, "context");
  const rocId = requireString(data.roc_id, "roc_id");

  const permissions = isPlainObject(data.permissions) ? (data.permissions as Record<string, unknown>) : {};
  const approvals = isPlainObject(data.approvals) ? (data.approvals as Record<string, unknown>) : {};

  const allowedTools = requireStringArrayOptional(permissions.allowed_tools);
  const forbiddenTools = requireStringArrayOptional(permissions.forbidden_tools);
  const approvalsRequiredFor = requireStringArrayOptional(approvals.required_for);

  const violationOutcomeRaw = typeof data.violation_outcome === "string" ? data.violation_outcome : "needs-review";
  const violationOutcome = normalizeViolationOutcome(violationOutcomeRaw);

  return {
    context,
    rocId,
    allowedTools,
    forbiddenTools,
    approvalsRequiredFor,
    violationOutcome,
  };
}

function evaluateCompliance(input: { roc: RocData; usedTools: string[]; approvals: string[] }): ComplianceResult {
  const violations: string[] = [];
  const missingApprovals: string[] = [];

  if (input.roc.forbiddenTools.length > 0) {
    for (const tool of input.usedTools) {
      if (input.roc.forbiddenTools.includes(tool)) {
        violations.push(`forbidden_tool:${tool}`);
      }
    }
  }

  if (input.roc.allowedTools.length > 0) {
    for (const tool of input.usedTools) {
      if (!input.roc.allowedTools.includes(tool)) {
        violations.push(`unauthorized_tool:${tool}`);
      }
    }
  }

  if (input.roc.approvalsRequiredFor.length > 0) {
    for (const required of input.roc.approvalsRequiredFor) {
      if (!input.approvals.includes(required)) {
        missingApprovals.push(required);
        violations.push(`missing_approval:${required}`);
      }
    }
  }

  return {
    status: violations.length === 0 ? "pass" : "violations",
    violations,
    missingApprovals,
    violationOutcome: input.roc.violationOutcome,
  };
}

function renderReport(input: {
  context: string;
  sessionId: string;
  rocId: string;
  rocPath: string;
  status: "pass" | "violations";
  violationOutcome: string;
  checkedAt: string;
  usedTools: string[];
  missingApprovals: string[];
  violations: string[];
}): string {
  const frontmatter = [
    "---",
    "type: U.RoCReport",
    "schema_version: \"0.1.0\"",
    "version: \"0.1.0\"",
    `context: ${JSON.stringify(input.context)}`,
    `session_id: ${JSON.stringify(input.sessionId)}`,
    `roc_id: ${JSON.stringify(input.rocId)}`,
    `roc_path: ${JSON.stringify(input.rocPath)}`,
    `status: ${JSON.stringify(input.status)}`,
    `violation_outcome: ${JSON.stringify(input.violationOutcome)}`,
    `checked_at: ${JSON.stringify(input.checkedAt)}`,
    renderYamlKeyList("used_tools", input.usedTools),
    renderYamlKeyList("missing_approvals", input.missingApprovals),
    renderYamlKeyList("violations", input.violations),
    "---",
  ];

  const lines: string[] = [];
  lines.push(`# RoC Compliance Report: ${input.sessionId}`);
  lines.push("");
  lines.push("## Status");
  lines.push(input.status === "pass" ? "Pass" : "Violations");
  lines.push("");
  lines.push("## Violations");
  lines.push(...renderListBlock(input.violations));
  lines.push("");
  lines.push("## Missing Approvals");
  lines.push(...renderListBlock(input.missingApprovals));
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

function parseYamlDocument(text: string, sourceName: string): Record<string, unknown> {
  const lines = text.split(/\r?\n/);
  const result: Record<string, unknown> = {};
  const stack: Array<{ indent: number; container: Record<string, unknown> | unknown[] }> = [{ indent: -1, container: result }];

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i] ?? "";
    const stripped = stripComments(rawLine).trimEnd();
    if (stripped.trim().length === 0) {
      continue;
    }

    const indent = countIndent(stripped);
    const content = stripped.trimStart();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1]?.container;
    if (!current) {
      throw new Error(`${sourceName}:${i + 1} invalid indentation`);
    }

    if (content.startsWith("-")) {
      if (!Array.isArray(current)) {
        throw new Error(`${sourceName}:${i + 1} list item without a list parent`);
      }
      const value = content === "-" ? "" : content.slice(1).trimStart();
      current.push(parseScalar(value));
      continue;
    }

    const match = content.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
    if (!match) {
      throw new Error(`${sourceName}:${i + 1} invalid mapping entry`);
    }

    if (Array.isArray(current)) {
      throw new Error(`${sourceName}:${i + 1} mapping entry inside a list`);
    }

    const key = match[1] ?? "";
    const value = match[2];

    if (Object.prototype.hasOwnProperty.call(current, key)) {
      throw new Error(`${sourceName}:${i + 1} duplicate key '${key}'`);
    }

    if (value === undefined) {
      const nextInfo = peekNextContent(lines, i + 1);
      const container = nextInfo && nextInfo.indent > indent && nextInfo.content.startsWith("-") ? [] : {};
      current[key] = container;
      stack.push({ indent, container });
      continue;
    }

    if (value.trim() === "[]") {
      current[key] = [];
      continue;
    }

    current[key] = parseScalar(value.trim());
  }

  return result;
}

function peekNextContent(lines: string[], startIndex: number): { indent: number; content: string } | null {
  for (let i = startIndex; i < lines.length; i += 1) {
    const stripped = stripComments(lines[i] ?? "").trimEnd();
    if (stripped.trim().length === 0) {
      continue;
    }
    const indent = countIndent(stripped);
    return { indent, content: stripped.trimStart() };
  }
  return null;
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
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (char === "#" && !inSingle && !inDouble) {
      return value.slice(0, i);
    }
  }
  return value;
}

function countIndent(line: string): number {
  let indent = 0;
  for (const char of line) {
    if (char === " ") {
      indent += 1;
      continue;
    }
    if (char === "\t") {
      throw new Error("Tabs are not allowed in YAML indentation.");
    }
    break;
  }
  return indent;
}

function parseScalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
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

function normalizeViolationOutcome(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const allowed = new Set(["blocked", "needs-review"]);
  if (!allowed.has(trimmed)) {
    throw new Error(`Invalid violation_outcome '${value}'. Expected blocked or needs-review.`);
  }
  return trimmed;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing or invalid ${label}.`);
  }
  return value.trim();
}

function requireStringArrayOptional(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("Invalid list value.");
  }
  const entries = value.map((entry) => {
    if (typeof entry !== "string") {
      throw new Error("Invalid list entry. Expected string values.");
    }
    return entry.trim();
  });
  return entries.filter((entry) => entry.length > 0);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    "governance/check-roc-compliance",
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
    console.error("Missing roc-path.");
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
    "Usage: bun develop/skills/src/governance/check-roc-compliance/index.ts --context <Context> --session-id <Id> --roc-path <Path> [--used-tools \"rg; bun\"] [--approvals \"schema_changes\"] [--agent-type <Type>] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
