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
    "roc-id": { type: "string" },
    constraints: { type: "string" },
    "allowed-tools": { type: "string" },
    "forbidden-tools": { type: "string" },
    "approvals-required-for": { type: "string" },
    "approver-role": { type: "string" },
    "escalations-trigger-on": { type: "string" },
    "escalation-target": { type: "string" },
    "violation-outcome": { type: "string" },
    "evolution-notes": { type: "string" },
    "agent-type": { type: "string" },
    "agent-model": { type: "string" },
    "role-assignment": { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values["roc-id"]) {
  printUsage();
  process.exit(1);
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const rocId = requireMatch(values["roc-id"], /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "roc-id", "a safe path segment (letters, digits, '_' or '-')");

const constraints = parseSemicolonList(values.constraints);
const allowedTools = parseSemicolonList(values["allowed-tools"]);
const forbiddenTools = parseSemicolonList(values["forbidden-tools"]);
const approvalsRequiredFor = parseSemicolonList(values["approvals-required-for"]);
const approverRole = normalizeOptional(values["approver-role"]);
const escalationsTriggerOn = parseSemicolonList(values["escalations-trigger-on"]);
const escalationTarget = normalizeOptional(values["escalation-target"]) ?? "human";
const violationOutcome = normalizeViolationOutcome(values["violation-outcome"]);
const evolutionNotes = normalizeOptional(values["evolution-notes"]);
const agentType = normalizeOptional(values["agent-type"]);
const agentModel = normalizeOptional(values["agent-model"]);
const roleAssignment = normalizeOptional(values["role-assignment"]) ?? "Strategist";
const relatedDecisions = parseSemicolonList(values.decisions);

if (!hasContent(constraints, allowedTools, forbiddenTools, approvalsRequiredFor, approverRole, escalationsTriggerOn)) {
  console.error("RoC must include at least one constraint, permission, approval, or escalation rule.");
  process.exit(1);
}

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);

const rocDir = join(repoRoot, "runtime", "contexts", context, "roc");
mkdirSync(rocDir, { recursive: true });

const rocPath = join(rocDir, `${rocId}.roc.yaml`);
if (existsSync(rocPath)) {
  console.error(`Error: RoC file already exists at ${rocPath}`);
  process.exit(1);
}

const yaml = renderRocYaml({
  context,
  rocId,
  constraints,
  allowedTools,
  forbiddenTools,
  approvalsRequiredFor,
  approverRole,
  escalationsTriggerOn,
  escalationTarget,
  violationOutcome,
  evolutionNotes,
  definedAt: isoTimestamp,
});

await Bun.write(rocPath, yaml);

const normalizedDecisions = relatedDecisions.map((entry) => normalizeArtifactRef(entry, repoRoot));

logWork({
  repoRoot,
  context,
  roleAssignment,
  action: `Defined RoC '${rocId}' for ${context}.`,
  outputs: [toRepoRelative(rocPath, repoRoot)],
  relatedDecisions: normalizedDecisions,
  agentSession: undefined,
  agentModel,
  agentType,
  timestampStart: values["timestamp-start"],
});

console.log(`RoC defined: ${rocPath}`);

function hasContent(
  constraintsList: string[],
  allowedList: string[],
  forbiddenList: string[],
  requiredApprovals: string[],
  approver: string | undefined,
  escalationsList: string[],
): boolean {
  return (
    constraintsList.length > 0 ||
    allowedList.length > 0 ||
    forbiddenList.length > 0 ||
    requiredApprovals.length > 0 ||
    Boolean(approver) ||
    escalationsList.length > 0
  );
}

function renderRocYaml(input: {
  context: string;
  rocId: string;
  constraints: string[];
  allowedTools: string[];
  forbiddenTools: string[];
  approvalsRequiredFor: string[];
  approverRole?: string;
  escalationsTriggerOn: string[];
  escalationTarget: string;
  violationOutcome: string;
  evolutionNotes?: string;
  definedAt: string;
}): string {
  const lines: string[] = [];
  lines.push(`schema_version: "0.1.0"`);
  lines.push("type: U.RuleOfConstraints");
  lines.push(`version: "0.1.0"`);
  lines.push(`context: ${JSON.stringify(input.context)}`);
  lines.push(`roc_id: ${JSON.stringify(input.rocId)}`);
  lines.push(`defined_at: ${JSON.stringify(input.definedAt)}`);

  if (input.constraints.length > 0) {
    lines.push(...renderYamlKeyList("constraints", input.constraints, 0));
  }

  if (input.allowedTools.length > 0 || input.forbiddenTools.length > 0) {
    lines.push("permissions:");
    if (input.allowedTools.length > 0) {
      lines.push(...renderYamlKeyList("allowed_tools", input.allowedTools, 2));
    }
    if (input.forbiddenTools.length > 0) {
      lines.push(...renderYamlKeyList("forbidden_tools", input.forbiddenTools, 2));
    }
  }

  if (input.approvalsRequiredFor.length > 0 || input.approverRole) {
    lines.push("approvals:");
    if (input.approvalsRequiredFor.length > 0) {
      lines.push(...renderYamlKeyList("required_for", input.approvalsRequiredFor, 2));
    }
    if (input.approverRole) {
      lines.push(`  approver_role: ${JSON.stringify(input.approverRole)}`);
    }
  }

  if (input.escalationsTriggerOn.length > 0 || input.escalationTarget) {
    lines.push("escalations:");
    if (input.escalationsTriggerOn.length > 0) {
      lines.push(...renderYamlKeyList("trigger_on", input.escalationsTriggerOn, 2));
    }
    if (input.escalationTarget) {
      lines.push(`  target: ${JSON.stringify(input.escalationTarget)}`);
    }
  }

  lines.push(`violation_outcome: ${JSON.stringify(input.violationOutcome)}`);
  lines.push("evolution_policy:");
  lines.push("  status: reserved");
  if (input.evolutionNotes) {
    lines.push(`  notes: ${JSON.stringify(input.evolutionNotes)}`);
  }

  return `${lines.join("\n")}
`;
}

function renderYamlKeyList(key: string, values: string[], indent: number): string[] {
  const pad = " ".repeat(indent);
  if (values.length === 0) {
    return [`${pad}${key}: []`];
  }
  const lines = [`${pad}${key}:`];
  for (const value of values) {
    lines.push(`${pad}  - ${JSON.stringify(value)}`);
  }
  return lines;
}

function normalizeViolationOutcome(value: string | undefined): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (trimmed.length === 0) {
    return "needs-review";
  }
  const allowed = new Set(["blocked", "needs-review"]);
  if (!allowed.has(trimmed)) {
    console.error(`Invalid violation-outcome '${value ?? ""}'. Expected blocked or needs-review.`);
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
    "governance/define-roc",
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
    "Usage: bun develop/skills/src/governance/define-roc/index.ts --context <Context> --roc-id <Id> [--constraints \"a; b\"] [--allowed-tools \"rg; bun\"] [--forbidden-tools \"git reset --hard\"] [--approvals-required-for \"schema_changes; policy_changes\"] [--approver-role <Role>] [--escalations-trigger-on \"blocked; policy_conflict\"] [--escalation-target <Target>] [--violation-outcome <blocked|needs-review>] [--evolution-notes \"...\"] [--agent-type <Type>] [--agent-model <Model>] [--role-assignment <Role>] [--decisions \"...\"] [--timestamp-start <iso>]",
  );
}
