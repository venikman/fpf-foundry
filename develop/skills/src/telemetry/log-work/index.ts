#!/usr/bin/env bun
import { parseArgs } from "util";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, isAbsolute, join, relative, resolve } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

// A.15.1 U.Work Generator
// Usage: bun log-work.ts --method <MethodId> --role-assignment <RoleAssignment> --context <Ctx> --action <Description> [--outputs "..."] [--decisions "..."]

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    method: { type: "string" },
    "method-path": { type: "string" },
    "role-assignment": { type: "string" },
    spec: { type: "string" },
    role: { type: "string" },
    context: { type: "string" },
    action: { type: "string" },
    outputs: { type: "string" },
    decisions: { type: "string" },
    "timestamp-start": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

const rawMethod = values.method ?? values.spec;
const rawRoleAssignment = values["role-assignment"] ?? values.role;

if (!rawMethod || !rawRoleAssignment || !values.context || !values.action) {
  console.error("Usage: log-work --method <id> --role-assignment <assigned> --context <ctx> --action <desc> [--outputs \"a; b\"] [--decisions \"drr; drr\"]");
  process.exit(1);
}

/**
 * Validates an input value against a pattern or exits with a message.
 */
function requireMatch(value: string | undefined, pattern: RegExp, name: string, description: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0 || !pattern.test(trimmed)) {
    console.error(`Invalid ${name} '${value ?? ""}'. Expected ${description}.`);
    process.exit(1);
  }
  return trimmed;
}

/**
 * Ensures required text input is present and non-empty.
 */
function requireNonEmpty(value: string | undefined, name: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    console.error(`Missing ${name}.`);
    process.exit(1);
  }
  return trimmed;
}

type PosthogEvent = {
  method: string;
  roleAssignment: string;
  context: string;
  action: string;
  outputsCount: number;
  timestamp: string;
};

/**
 * Emits a PostHog event when configured via environment variables.
 */
async function emitPosthogEvent(event: PosthogEvent): Promise<void> {
  const apiKey = process.env.POSTHOG_API_KEY?.trim();
  const distinctId = process.env.POSTHOG_DISTINCT_ID?.trim();
  if (!apiKey || !distinctId) {
    return;
  }

  const host = (process.env.POSTHOG_HOST ?? "https://app.posthog.com").trim();
  let url: URL;
  try {
    url = new URL("/capture", host);
  } catch {
    console.warn(`WARN: Invalid POSTHOG_HOST '${host}'.`);
    return;
  }

  const includeAction = process.env.POSTHOG_INCLUDE_ACTION === "1";
  const properties: Record<string, unknown> = {
    method: event.method,
    context: event.context,
    outputs_count: event.outputsCount,
    action_length: event.action.length,
    action_included: includeAction,
  };
  if (includeAction) {
    properties.action = event.action;
    properties.role_assignment = event.roleAssignment;
  }

  const payload = JSON.stringify({
    api_key: apiKey,
    event: "u_work_logged",
    distinct_id: distinctId,
    properties,
    timestamp: event.timestamp,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`WARN: PostHog capture failed (${response.status}).`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`WARN: PostHog capture failed (${message}).`);
  } finally {
    clearTimeout(timeout);
  }
}

const method = requireNonEmpty(rawMethod, "method");
const roleAssignment = requireNonEmpty(rawRoleAssignment, "role-assignment");
const action = requireNonEmpty(values.action, "action");
const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");

// 1. Target: runtime/contexts/[Ctx]/telemetry/work/
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../../../../");
const targetDir = join(repoRoot, "runtime", "contexts", context, "telemetry", "work");

if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

const timestampStart = resolveTimestampStart(values["timestamp-start"]);
const isoTimestamp = timestampStart.toISOString();
const timestamp = isoTimestamp.replace(/[:.]/g, "-");
const filename = `work-${timestamp}.md`;
const filePath = join(targetDir, filename);

if (existsSync(filePath)) {
  console.error(`Error: Work record already exists at ${filePath}`);
  process.exit(1);
}

const methodRef = resolveMethodDescriptionRef(method, values["method-path"], repoRoot);
const outputs = parseSemicolonList(values.outputs).map((entry) => normalizeArtifactRef(entry, repoRoot));
const relatedDecisions = parseSemicolonList(values.decisions).map((entry) => normalizeArtifactRef(entry, repoRoot));
const inputsDigest = computeInputsDigest({
  methodDescriptionRef: methodRef,
  roleAssignmentRef: roleAssignment,
  context,
  action,
  outputs,
  relatedDecisions,
});

// 3. Content: A.15.1 U.Work Record
const content = `---
type: U.Work
timestamp_start: ${JSON.stringify(isoTimestamp)}
context: ${JSON.stringify(context)}
method_description_ref:
  id: ${JSON.stringify(methodRef.id)}
${methodRef.path ? `  path: ${JSON.stringify(methodRef.path)}\n` : ""}${methodRef.version ? `  version: ${JSON.stringify(methodRef.version)}\n` : ""}role_assignment_ref: ${JSON.stringify(roleAssignment)}
inputs_digest: ${JSON.stringify(inputsDigest)}
outputs: ${renderYamlStringList(outputs)}
related_decisions: ${renderYamlStringList(relatedDecisions)}
---

# U.Work: Execution of ${method}

## 1. Links
- **MethodDescription**: \`${methodRef.id}\`${methodRef.version ? ` (v${methodRef.version})` : ""}
- **RoleAssignment**: \`${roleAssignment}\`
- **Context**: \`${context}\`
- **InputsDigest**: \`${inputsDigest}\`

## 2. Occurrence
${action}

## 3. Outputs
${renderMarkdownList(outputs)}

## 4. Related Decisions
${renderMarkdownList(relatedDecisions)}

## 5. Evidence
- **Trace**: Generated by \`telemetry/log-work\`
`;

await Bun.write(filePath, content);
await emitPosthogEvent({
  method: methodRef.id,
  roleAssignment,
  context,
  action,
  outputsCount: outputs.length,
  timestamp: isoTimestamp,
});
console.log(`Work Logged: ${filePath}`);

type MethodDescriptionRef = {
  id: string;
  path?: string;
  version?: string;
};

type InputsDigestPayload = {
  methodDescriptionRef: MethodDescriptionRef;
  roleAssignmentRef: string;
  context: string;
  action: string;
  outputs: string[];
  relatedDecisions: string[];
};

function resolveTimestampStart(value?: string): Date {
  const explicit = (value ?? "").trim();
  if (explicit.length > 0) {
    return parseIsoTimestamp(explicit, `timestamp-start '${value}'`);
  }

  const fixedNow = (process.env.FPF_FIXED_NOW ?? "").trim();
  if (fixedNow.length > 0) {
    return parseIsoTimestamp(fixedNow, "FPF_FIXED_NOW");
  }

  return new Date();
}

function parseIsoTimestamp(value: string, source: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    console.error(`Invalid ${source} '${value}'. Expected an ISO-8601 date-time.`);
    process.exit(1);
  }
  return parsed;
}

function resolveMethodDescriptionRef(methodId: string, explicitPath: string | undefined, repoRootDir: string): MethodDescriptionRef {
  let resolvedPath: string | undefined;

  const trimmedPath = (explicitPath ?? "").trim();
  if (trimmedPath.length > 0) {
    const candidate = resolve(repoRootDir, trimmedPath);
    if (!existsSync(candidate)) {
      console.error(`Invalid method-path '${explicitPath}'. File not found.`);
      process.exit(1);
    }
    resolvedPath = toRepoRelative(candidate, repoRootDir);
  } else {
    const candidate = join(repoRootDir, "design", "skills", ...methodId.split("/"), "skill.json");
    if (existsSync(candidate)) {
      resolvedPath = toRepoRelative(candidate, repoRootDir);
    }
  }

  let version: string | undefined;
  if (resolvedPath) {
    try {
      const fullPath = resolve(repoRootDir, resolvedPath);
      const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
      if (typeof parsed.version === "string" && parsed.version.trim().length > 0) {
        version = parsed.version.trim();
      }
    } catch {
      // Best-effort: version/path enrichment is optional.
    }
  }

  return {
    id: methodId,
    ...(resolvedPath ? { path: resolvedPath } : {}),
    ...(version ? { version } : {}),
  };
}

function parseSemicolonList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeArtifactRef(value: string, repoRootDir: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;
  const absolute = isAbsolute(trimmed) ? trimmed : resolve(repoRootDir, trimmed);
  if (absolute.startsWith(repoRootDir + "/") || absolute === repoRootDir) {
    return toRepoRelative(absolute, repoRootDir);
  }
  return trimmed;
}

function computeInputsDigest(payload: InputsDigestPayload): string {
  const canonical = stableStringify(sortKeys(payload));
  return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

function renderYamlStringList(values: string[]): string {
  if (values.length === 0) {
    return "[]";
  }
  return `\n${values.map((value) => `  - ${JSON.stringify(value)}`).join("\n")}`;
}

function renderMarkdownList(values: string[]): string {
  if (values.length === 0) {
    return "- (none)";
  }
  return values.map((value) => `- \`${value}\``).join("\n");
}

function toRepoRelative(filePath: string, rootDir = process.cwd()): string {
  const rel = relative(rootDir, filePath);
  return rel.length === 0 ? "." : rel.split("\\").join("/");
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    const sorted: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      sorted[key] = sortKeys(entryValue);
    }
    return sorted;
  }
  return value;
}

function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
