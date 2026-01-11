#!/usr/bin/env bun
import { parseArgs } from "util";
import { existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

// E.9 Design-Rationale Record (DRR) Generator
// Usage: bun record-drr.ts --title <title> --context <context-string> --decision <decision>

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        title: { type: 'string' },
        context: { type: 'string' }, // The problem context, not Bounded Context
        decision: { type: 'string' },
    },
    strict: true,
    allowPositionals: true,
});

if (!values.title || !values.context || !values.decision) {
    console.error("Usage: record-drr --title <title> --context <problem> --decision <solution>");
    process.exit(1);
}

// 1. Resolve Target Directory: decisions/
// Root 'decisions' folder is standard for ADRs
const repoRoot = process.cwd();
const targetDir = join(repoRoot, "decisions");

if (!existsSync(targetDir)) {
    console.log(`Initializing decisions directory: ${targetDir}`);
    mkdirSync(targetDir, { recursive: true });
}

// 2. Determine Next ID (NNN)
const files = readdirSync(targetDir).filter(f => f.endsWith('.md'));
let maxId = 0;
for (const f of files) {
    const match = f.match(/^(\d+)-/);
    if (match) {
        const id = parseInt(match[1], 10);
        if (id > maxId) maxId = id;
    }
}
const nextId = String(maxId + 1).padStart(3, '0');

// 3. Format Filename
const kebabTitle = values.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const filename = `${nextId}-${kebabTitle}.md`;
const filePath = join(targetDir, filename);

// 4. Generate Content (Pattern E.9)
const dateStr = new Date().toISOString().split('T')[0];

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
