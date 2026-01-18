#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { resolveNow } from "../../_shared/utils";

// E.9 Design-Rationale Record (DRR) Generator
// Usage: bun record-drr.ts --title <title> --context <context-string> --decision <decision> [--work-context <ctx>]

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    title: { type: "string" },
    context: { type: "string" }, // The problem context, not Bounded Context
    decision: { type: "string" },
    "work-context": { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.title || !values.context || !values.decision) {
  console.error("Usage: record-drr --title <title> --context <problem> --decision <solution> [--work-context <ctx>]");
  process.exit(1);
}

const workContext = values["work-context"] ?? "Skills";

// 1. Resolve Target Directory: design/decisions/
// Root decisions folder is standard for ADRs
const repoRoot = process.cwd();
const targetDir = join(repoRoot, "design", "decisions");

if (!existsSync(targetDir)) {
  console.log(`Initializing decisions directory: ${targetDir}`);
  mkdirSync(targetDir, { recursive: true });
}

// 2. Determine Next ID (NNN)
const files = readdirSync(targetDir).filter((f) => f.endsWith(".md"));
let maxId = 0;
for (const f of files) {
  const match = f.match(/^(\d+)-/);
  if (match) {
    const id = parseInt(match[1], 10);
    if (id > maxId) maxId = id;
  }
}
const nextId = String(maxId + 1).padStart(3, "0");

// 3. Format Filename
const kebabTitle = values.title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");
const filename = `${nextId}-${kebabTitle}.md`;
const filePath = join(targetDir, filename);

// 4. Generate Content (Pattern E.9)
const dateStr = resolveNow().toISOString().split("T")[0];

const content = `# ${nextId}. ${values.title}

## Status
**Proposed** on ${dateStr}

## Context
${values.context}

## Decision
${values.decision}

## Consequences
### Positive
- [ ] Explicit alignment with ...

### Negative
- [ ] Potential overhead from ...

## Compliance
- [ ] **E.9 DRR**: Follows standard format.
`;

// 5. Trace & Write
console.log(`Recording DRR: ${filename}...`);
await Bun.write(filePath, content);
console.log(`Success: Recorded ${filePath}`);

// 6. Automatic Work Logging (Skill Composition)
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
        "design/record-drr",
        "--role-assignment",
        "Archivist",
        "--context",
        workContext,
        "--action",
        `Recorded DRR '${values.title}' (${filename})`,
        "--outputs",
        filePath,
        "--decisions",
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
