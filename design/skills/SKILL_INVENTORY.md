# FPF Skill Inventory (Generated)

This file is generated from skill.yaml files. Do not edit manually.

## Inventory schema (v1)

Columns
- Skill ID: canonical ID, also used as path segment under `develop/skills/src/`.
- Family: required taxonomy. It MUST mean "capability area" (not a duplicate of namespace).
- PatternRefs: `;`-separated list of spec pattern identifiers (example: `E.9; A.10`). Use `-` if none.
- PolicyRealization: constraint realization strategy (`passive` or `audit/<skill-id>`). Use `-` if not applicable.
- Status: one of `planned | experimental | stable | deprecated`.
- Impl: one of `none | stub | code` (stub = SKILL.md exists but no runnable implementation yet).
- Outputs: `;`-separated list of primary artifacts besides `U.Work` (example: `NameCard; WorkPlan`). Use `-` if none.
- Description: short summary of the Skill's intent.

| Skill ID | Family | PatternRefs | PolicyRealization | Status | Impl | Outputs | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `design/mint-name` | Design | E.5.1; F.18 | - | experimental | code | - | Mints a new F.18 Name Card with strict Twin-Label and Sense-Seed validation. |
| `design/record-drr` | Design | A.10; E.9 | - | experimental | code | - | Records a formal Design-Rationale Record (DRR) for architectural decisions. |
| `telemetry/log-work` | Telemetry | A.15.1 | - | experimental | code | - | Generates a U.Work record for an action (Pattern A.15.1). |
