---
name: design/scaffold-skill
description: Scaffolds a new Skill (SkillSpec + SKILL.md + code stub + fixtures + test harness), regenerates inventory + index, and logs U.Work.
version: 0.1.1
status: experimental
family: design
role: Toolsmith
allowed_tools:
  - run_command
  - write_to_file
policies:
  - A.15 Role–Method–Work Alignment
  - E.19 Conformance Checklists
---

# Design: Scaffold Skill

## Execution

Run:

```bash
bun develop/skills/src/design/scaffold-skill/index.ts \
  --skill-id "design/my-skill" \
  --name "My Skill" \
  --summary "One line summary."
```

Outputs:

- `design/skills/<skill-id>/skill.json`
- `design/skills/<skill-id>/SKILL.md`
- `develop/skills/src/<skill-id>/index.ts`
- `develop/skills/src/<skill-id>/fixtures/input.json`
- `develop/skills/src/<skill-id>/fixtures/expected.json`
- `develop/skills/src/<skill-id>/index.test.ts`
- `design/skills/SKILL_INVENTORY.md` (regenerated)
- `design/skills/SKILL_INDEX.json` (regenerated)

This also attempts to log a `U.Work` record via `telemetry/log-work`.
