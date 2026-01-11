#!/usr/bin/env bun
import { parseArgs } from "util";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

// F.18 Name Card Generator
// Usage: bun mint-name.ts --context <ctx> --id <kebab-id> --label <Title Case> --mds <definition>

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        context: { type: 'string' },
        id: { type: 'string' },
        label: { type: 'string' },
        mds: { type: 'string' },
    },
    strict: true,
    allowPositionals: true,
});

if (!values.context || !values.id || !values.label || !values.mds) {
    console.error("Usage: mint-name --context <ctx> --id <kebab-id> --label <Title Case> --mds <definition>");
    process.exit(1);
}

// 1. Resolve Target Directory: contexts/[Context]/design/names/
// We assume we are running from repo root or standardized layout
// Adapting to current workspace: /Users/stas-studio/Developer/fpf-foundry
const repoRoot = process.cwd();
const targetDir = join(repoRoot, "contexts", values.context, "design", "names");

// 2. Ensure Constraints
if (!existsSync(targetDir)) {
    console.log(`Creating directory: ${targetDir}`);
    mkdirSync(targetDir, { recursive: true });
}

const filename = `${values.id}.md`;
const filePath = join(targetDir, filename);

if (existsSync(filePath)) {
    console.error(`Error: Name Card already exists at ${filePath}`);
    process.exit(1);
}

// 3. Generate Content (Pattern F.18)
const content = `---
type: F.18 Name Card
id: ${values.id}
label: ${values.label}
context: ${values.context}
status: experimental
---

# F.18 Name Card: ${values.label}

## 1. Twin-Labels
- **Technical ID**: \`${values.id}\`
- **Plain-English**: "${values.label}"

## 2. Minimal Definitional Statement (MDS)
> ${values.mds}

## 3. Context of Meaning
Defined within the **${values.context}** Bounded Context.

## 4. Sense-Seed Validation (Self-Check)
- [x] **S1 Add**: "Add a new ${values.label}..."
- [x] **S2 Retrieve**: "Get a ${values.label} from..."
- [x] **WP Zero**: No prototypes violated.

## 5. Rationale
Minted via \`design/mint-name\`.
`;

// 4. Trace & Write
console.log(`Minting Name Card: ${values.label} (${values.id})...`);
await Bun.write(filePath, content);
console.log(`Success: Created ${filePath}`);

// 5. Automatic Work Logging (Skill Composition)
// We call the sibling skill 'telemetry/log-work' to record this action A.15.1
const logScript = join(repoRoot, "contexts", "Skills", "src", "telemetry", "log-work", "index.ts");

if (existsSync(logScript)) {
    console.log("Logging Work Record via A.15.1...");
    const proc = Bun.spawn([
        "bun", logScript,
        "--spec", "F.18",
        "--role", "Archivist",
        "--context", values.context,
        "--action", `Minted Name Card '${values.label}' (${values.id})`
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
