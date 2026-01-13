# FPF Foundry

FPF Foundry is a Bun + TypeScript workspace for turning “how we think and work” into concrete, auditable artifacts: names, decisions, and work logs. It’s opinionated on purpose: small tools (“skills”) generate files in predictable places, with safety and consistency checks baked in.

FPF references used in this repo today: **F.18 (Name Card)**, **E.9 (Design-Rationale Record / DRR)**, **A.15.1 (U.Work record)**.

## What you get (practical outputs)

You don’t “install a library” here; you run skills that mint real artifacts you can review in Git:

- **Vocabulary you can point to**: Name Cards under `runtime/contexts/<Context>/design/names/…`
- **Decisions you can diff**: DRRs under `design/decisions/…`
- **Work traces you can audit**: U.Work records under `runtime/contexts/<Context>/telemetry/work/…`
- **A living skill inventory** generated from SkillSpec (`design/skills/SKILL_INVENTORY.md`)

## Current usable skills (run from repo root)

### 1) Mint a Name (F.18)
Creates a Name Card in a bounded context (directory) and logs the action as U.Work.

```sh
bun develop/skills/src/design/mint-name/index.ts \
  --context Tooling \
  --id fpf-foundry \
  --label "FPF Foundry" \
  --mds "The workshop repo that mints names, skills, and audit-ready artifacts."
```

Outputs:

runtime/contexts/Tooling/design/names/fpf-foundry.md

runtime/contexts/Tooling/telemetry/work/work-<timestamp>.md (via telemetry/log-work)

Constraints (enforced):

--context must be a safe path segment ([A-Za-z0-9_-], starts with alnum)

--id must be kebab-case (lowercase, digits, -)

2) Record a DRR (E.9)

Creates a numbered decision record (ADR-like) and logs the action as U.Work.

bun develop/skills/src/design/record-drr/index.ts \
  --title "Adopt SkillSpec JSON as the canonical format" \
  --context "We need a strict, toolable, cross-checkable skill definition format." \
  --decision "Use skill.json as the only SkillSpec source of truth; validate + inventory from it." \
  --work-context Tooling


Outputs:

design/decisions/NNN-adopt-skillspec-json-as-the-canonical-format.md

runtime/contexts/Tooling/telemetry/work/work-<timestamp>.md

Notes:

--work-context defaults to Skills if omitted.

3) Log Work (A.15.1)

Writes a standalone work record (used by other skills for audit trace).

bun develop/skills/src/telemetry/log-work/index.ts \
  --spec "A.15.1" \
  --role "Archivist" \
  --context Tooling \
  --action "Ran a manual work log example."


Output:

runtime/contexts/Tooling/telemetry/work/work-<timestamp>.md

Setup

Prereq: Bun (https://bun.sh
)

bun install


Optional: enable the pre-commit hook for local safety checks:

git config core.hooksPath .githooks

Skill inventory & SkillSpec

Skills have three “layers”:

SkillSpec (machine-readable): design/skills/**/skill.json

Skill doc (human-facing, optional but expected for non-none): design/skills/**/SKILL.md (frontmatter is used by tooling)

Implementation (runnable, optional): develop/skills/src/<skill-id>/index.ts

Validate all SkillSpec:

bun develop/tools/skill/validate.ts --all


Regenerate inventory:

bun develop/tools/skill/inventory.ts


Inventory files:

design/skills/SKILL_INVENTORY.md (generated; do not hand-edit)

design/skills/SKILL_BACKLOG.md (planned skills)

Safety & consistency gates

This repo is intentionally hostile to subtle corruption and drift:

No JavaScript source (TypeScript only):

bun develop/scripts/no_js_files_check.ts --all


Unicode safety scan (hidden/bidi/control characters; Trojan Source class):

bun develop/scripts/unicode_safety_check.ts --all


Repo checks (format, lint, safety scan, SkillSpec validation, inventory cross-checks):

bun run check

Repo layout (mental model)

design/ — specs, decisions, examples, skill definitions (source-of-truth docs/specs)

develop/ — tooling + runnable skill implementations

runtime/ — generated outputs (contexts, emitted artifacts, indexes). Expect churn here.

.codex/ — Codex CLI SKILL.md packages (separate from SkillSpec; reserved by tooling)

Status

Everything is experimental. The point is fast iteration with strict invariants:

skills should be small, deterministic, and file-output based

any “real” action should leave a U.Work trail (A.15.1)

generated inventories must match what’s actually implemented

Start with design/skills/SKILL_INVENTORY.md to see what exists, and design/skills/SKILL_BACKLOG.md to see what’s planned.


FPF patterns/specs referenced above: **F.18**, **E.9**, **A.15.1**.
