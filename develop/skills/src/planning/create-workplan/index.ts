#!/usr/bin/env bun
import { parseArgs } from "util";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// A.15.2 WorkPlan Generator
// Usage: bun create-workplan.ts --context <ctx> --id <kebab-id> --title <title> --intent <intent> [--deliverables "Item; Item"]

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    context: { type: "string" },
    id: { type: "string" },
    title: { type: "string" },
    intent: { type: "string" },
    deliverables: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values.id || !values.title || !values.intent) {
  console.error("Usage: create-workplan --context <ctx> --id <kebab-id> --title <title> --intent <intent> [--deliverables \"Item; Item\"]");
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

/**
 * Parses a semicolon-delimited deliverables string into a list.
 */
function parseDeliverables(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Finds the repository root by walking up to package.json.
 */
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

/**
 * Escapes a string for safe YAML double-quoted scalars.
 */
function yamlEscape(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
  return `"${escaped}"`;
}

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const id = requireMatch(values.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id", "kebab-case (lowercase letters, digits, '-')");
const title = requireNonEmpty(values.title, "title");
const intent = requireNonEmpty(values.intent, "intent");
const deliverables = parseDeliverables(values.deliverables);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);
const targetDir = join(repoRoot, "runtime", "contexts", context, "planning", "workplans");

if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

const filePath = join(targetDir, `${id}.md`);
if (existsSync(filePath)) {
  console.error(`Error: WorkPlan already exists at ${filePath}`);
  process.exit(1);
}

const dateStr = resolveNow().toISOString().split("T")[0];
const deliverableLines = deliverables.length > 0 ? deliverables.map((entry) => `- ${entry}`) : ["- TBD"];

const content = `---
type: WorkPlan
id: ${id}
title: ${yamlEscape(title)}
context: ${yamlEscape(context)}
status: draft
created: ${dateStr}
---

# WorkPlan: ${title}

## Intent
${intent}

## Deliverables
${deliverableLines.join("\n")}

## Notes
- Created by \`planning/create-workplan\`.
`;

await Bun.write(filePath, content);
console.log(`Success: Created ${filePath}`);

const logWorkSkillId = "telemetry/log-work";
const skillsCodeRoot = join(repoRoot, "develop", "skills", "src");

/**
 * Resolves a skill id to a runnable script path when present.
 */
function resolveSkillPath(skillId: string): string | null {
  const parts = skillId.split("/");
  const tsPath = join(skillsCodeRoot, ...parts, "index.ts");
  if (existsSync(tsPath)) {
    return tsPath;
  }
  const jsPath = join(skillsCodeRoot, ...parts, "index.js");
  if (existsSync(jsPath)) {
    return jsPath;
  }
  return null;
}

const logScript = resolveSkillPath(logWorkSkillId);

if (logScript) {
  console.log("Logging Work Record via A.15.1...");
  try {
    const proc = Bun.spawn({
      cmd: [
        "bun",
        logScript,
        "--method",
        "planning/create-workplan",
        "--role-assignment",
        "Planner",
        "--context",
        context,
        "--action",
        `Created WorkPlan '${title}' (${id})`,
        "--outputs",
        filePath,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    await proc.exited;
    if (proc.exitCode === 0) {
      console.log("Work Logged Successfully.");
    } else {
      console.warn("WARN: Failed to log work.");

      const stdoutText = proc.stdout ? await new Response(proc.stdout).text() : "";
      const stderrText = proc.stderr ? await new Response(proc.stderr).text() : "";

      if (stdoutText.trim().length > 0) {
        console.warn("log-work stdout:");
        console.warn(stdoutText.trimEnd());
      }

      if (stderrText.trim().length > 0) {
        console.warn("log-work stderr:");
        console.warn(stderrText.trimEnd());
      }
    }
  } catch (error) {
    console.warn("WARN: Failed to start work logging process.", error);
  }
} else {
  console.warn(`WARN: ${logWorkSkillId} skill not found; skipping audit trace.`);
}

function resolveNow(): Date {
  const fixedNow = process.env.FPF_FIXED_NOW?.trim();
  if (fixedNow && fixedNow.length > 0) {
    const parsed = new Date(fixedNow);
    if (Number.isNaN(parsed.getTime())) {
      console.error(`Invalid FPF_FIXED_NOW '${fixedNow}'. Expected an ISO-8601 date-time.`);
      process.exit(1);
    }
    return parsed;
  }

  return new Date();
}
