# FPF Skill Inventory (Generated)

This file is generated from skill.json files. Do not edit manually.

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
| `design/init-context` | Design | A.15 | - | experimental | code | context_root; readme_path | Initializes a bounded context skeleton under runtime/contexts to prevent directory drift. |
| `design/mint-name` | Design | E.5.1; F.18 | - | experimental | code | name_card_path | Mints a new F.18 Name Card with strict Twin-Label and Sense-Seed validation. |
| `design/record-drr` | Design | A.10; E.9 | - | experimental | code | drr_path | Records a formal Design-Rationale Record (DRR) for architectural decisions. |
| `design/scaffold-skill` | Design | A.15; E.19 | - | experimental | code | code_stub_path; fixture_expected_path; fixture_input_path; inventory_path; skill_index_path; skill_md_path; skill_spec_path; test_harness_path | Scaffolds a new Skill folder (SkillSpec + SKILL.md + code stub + fixtures + test harness) and registers it in the inventory index. |
| `planning/create-workplan` | Planning | A.15.1; A.15.2 | - | experimental | code | WorkPlan | Creates a WorkPlan (Schedule of Intent) and stores it under runtime/contexts. |
| `telemetry/log-work` | Telemetry | A.15.1 | - | experimental | code | work_record_path | Generates a U.Work record for an action (Pattern A.15.1). |
