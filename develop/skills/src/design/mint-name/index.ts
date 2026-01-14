#!/usr/bin/env bun
import { parseArgs } from "util";
import { existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

// F.18 Name Card Generator
// Usage: bun mint-name.ts --context <ctx> --id <kebab-id> --label <Title Case> --mds <definition>

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    context: { type: "string" },
    id: { type: "string" },
    label: { type: "string" },
    mds: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.context || !values.id || !values.label || !values.mds) {
  console.error("Usage: mint-name --context <ctx> --id <kebab-id> --label <Title Case> --mds <definition>");
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

const context = requireMatch(values.context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
const id = requireMatch(values.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id", "kebab-case (lowercase letters, digits, '-')");
const label = values.label.trim();
const mds = values.mds.trim();

// 1. Resolve Target Directory: runtime/contexts/[Context]/design/names/
// We assume we are running from repo root or standardized layout
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../../../../");
const targetDir = join(repoRoot, "runtime", "contexts", context, "design", "names");

// 2. Ensure Constraints
if (!existsSync(targetDir)) {
  console.log(`Creating directory: ${targetDir}`);
  mkdirSync(targetDir, { recursive: true });
}

const filename = `${id}.md`;
const filePath = join(targetDir, filename);

if (existsSync(filePath)) {
  console.error(`Error: Name Card already exists at ${filePath}`);
  process.exit(1);
}

// 3. Generate Content (Pattern F.18)
const content = `---
type: F.18 Name Card
id: ${id}
label: ${label}
context: ${context}
status: experimental
---

# F.18 Name Card: ${label}

## 1. Twin-Labels
- **Technical ID**: \`${id}\`
- **Plain-English**: "${label}"

## 2. Minimal Definitional Statement (MDS)
> ${mds}

## 3. Context of Meaning
Defined within the **${context}** Bounded Context.

## 4. Sense-Seed Validation (Self-Check)
- [x] **S1 Add**: "Add a new ${label}..."
- [x] **S2 Retrieve**: "Get a ${label} from..."
- [x] **WP Zero**: No prototypes violated.

## 5. Rationale
Minted via \`design/mint-name\`.
`;

// 4. Trace & Write
console.log(`Minting Name Card: ${label} (${id})...`);
await Bun.write(filePath, content);
console.log(`Success: Created ${filePath}`);

// 5. Automatic Work Logging (Skill Composition)
// We call the sibling skill 'telemetry/log-work' to record this action A.15.1
const logScript = join(repoRoot, "develop", "skills", "src", "telemetry", "log-work", "index.ts");

if (existsSync(logScript)) {
  console.log("Logging Work Record via A.15.1...");
  const proc = Bun.spawn([
    "bun",
    logScript,
    "--method",
    "design/mint-name",
    "--role-assignment",
    "Archivist",
    "--context",
    context,
    "--action",
    `Minted Name Card '${label}' (${id})`,
    "--outputs",
    filePath,
  ]);

  await proc.exited;
  if (proc.exitCode === 0) {
    console.log("✔ Work Logged Successfully.");
  } else {
    console.error("⚠ Failed to log work.");
  }
} else {
  console.warn("⚠ Log-Work skill not found; skipping audit trace.");
}
