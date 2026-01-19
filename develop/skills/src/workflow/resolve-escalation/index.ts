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
    "escalation-id": { type: "string" },
    decision: { type: "string" },
    "resolved-by": { type: "string" },
    notes: { type: "string" },
    "agent-model": { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values["escalation-id"] || !values.decision) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const escalationId = requireMatch(values["escalation-id"], /^[A-Za-z0-9][A-Za-z0-9_.-]*$/, "escalation-id", "a safe path segment (letters, digits, '_', '-', or '.')");
if (escalationId.includes("..")) {
  console.error("Invalid escalation-id. Dot-segments are not allowed.");
  process.exit(1);
}
const decision = normalizeDecision(values.decision);
const resolvedBy = normalizeOptional(values["resolved-by"]);
const notes = normalizeOptional(values.notes);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "Strategist";
const relatedDecisions = parseSemicolonList(values.decisions);

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();
const timestampSlug = isoTimestamp.replace(/[:.]/g, "-");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

const escalationPath = join(repoRoot, "runtime", "contexts", context, "escalations", `${escalationId}.escalation.md`);
if (!existsSync(escalationPath)) {
  console.error(`Error: Escalation record not found at ${escalationPath}`);
  process.exit(1);
}

const escalationInfo = loadEscalation(escalationPath);
const sessionId = escalationInfo.sessionId;

const resolutionPath = join(repoRoot, "runtime", "contexts", context, "escalations", `${escalationId}.${timestampSlug}.resolution.md`);
if (existsSync(resolutionPath)) {
  console.error(`Error: Escalation resolution already exists at ${resolutionPath}`);
  process.exit(1);
}

const resolutionContent = renderResolution({
  context,
  sessionId,
  escalationId,
  decision,
  resolvedBy,
  resolvedAt: isoTimestamp,
  notes,
});

await Bun.write(resolutionPath, resolutionContent);

const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Resolved escalation '${escalationId}' with decision '${decision}'.`,
  outputs: [toRepoRelative(resolutionPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: sessionId,
  agentModel,
  agentType: undefined,
  timestampStart: values["timestamp-start"],
});

console.log(`Escalation resolved: ${resolutionPath}`);

function loadEscalation(filePath: string): { sessionId: string } {
  const content = readFileSync(filePath, "utf8");
  const parsed = splitFrontmatter(content);
  if (!parsed) {
    console.error(`Error: Escalation record missing front matter at ${filePath}`);
    process.exit(1);
  }
  const data = parseFrontmatterMap(parsed.frontmatter);
  const sessionId = data.session_id ?? "";
  if (!sessionId) {
    console.error(`Error: Escalation record missing session_id at ${filePath}`);
    process.exit(1);
  }
  return { sessionId };
}

function renderResolution(input: {
  context: string;
  sessionId: string;
  escalationId: string;
  decision: string;
  resolvedBy?: string;
  resolvedAt: string;
  notes?: string;
}): string {
  const frontmatter = [
    "---",
    "type: U.EscalationResolution",
    "schema_version: \"0.1.0\"",
    "version: \"0.1.0\"",
    `context: ${JSON.stringify(input.context)}`,
    `session_id: ${JSON.stringify(input.sessionId)}`,
    `escalation_id: ${JSON.stringify(input.escalationId)}`,
    `decision: ${JSON.stringify(input.decision)}`,
    `resolved_at: ${JSON.stringify(input.resolvedAt)}`,
  ];
  if (input.resolvedBy) {
    frontmatter.push(`resolved_by: ${JSON.stringify(input.resolvedBy)}`);
  }
  if (input.notes) {
    frontmatter.push(`notes: ${JSON.stringify(input.notes)}`);
  }
  frontmatter.push("---");

  const lines: string[] = [];
  lines.push(`# Escalation Resolution: ${input.escalationId}`);
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

function normalizeDecision(value: string | undefined): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  const allowed = new Set(["resolved", "needs-review", "blocked"]);
  if (!allowed.has(trimmed)) {
    console.error(`Invalid decision '${value ?? ""}'. Expected resolved, needs-review, or blocked.`);
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
    "workflow/resolve-escalation",
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
    "Usage: bun develop/skills/src/workflow/resolve-escalation/index.ts --context <Context> --escalation-id <Id> --decision <resolved|needs-review|blocked> [--resolved-by <Label>] [--notes \"...\"] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
