# FPF Skill Backlog (Planned)

This file contains planned skills that are not yet implemented.

## Backlog schema (v1)
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
| `metric/evaluate-cslc` | Metric | A.18 | - | planned | none | - | Evaluates a Characteristic (CSLC). |
| `reasoning/abductive-loop` | Reasoning | B.5.2 | - | planned | none | - | Runs the Explore-Shape-Evidence-Operate loop. |
| `audit/audit-lexicon` | Audit | E.5.1 | audit/audit-lexicon | planned | none | - | Enforces Lexical Firewall rules. |
| `planning/create-workplan` | Planning | A.15.2 | - | planned | none | - | Creates a WorkPlan (Schedule of Intent). |
| `governance/assign-role` | Governance | A.2.1 | - | planned | none | - | Formally assigns a Role to a Holder. |
| `design/define-method` | Design | A.3.2 | - | planned | none | - | Defines a procedural Method (Recipe). |
| `audit/verify-evidence` | Audit | A.10 | audit/verify-evidence | planned | none | - | Verifies audit trails and evidence links. |
| `governance/check-gate` | Governance | A.21 | - | planned | none | - | Evaluates a standard Connectivity/Quality Gate. |
| `design/define-kind` | Design | C.3.2 | - | planned | none | - | Defines a new U.Kind (Type). |
| `audit/audit-naming` | Audit | E.10 | audit/audit-naming | planned | none | - | Audits compliance with LEX-BUNDLE naming. |
| `design/create-episteme` | Design | C.2.1 | - | planned | none | - | Scaffolds a new Episteme structure. |
| `publication/publish-mvpk` | Publication | E.17 | - | planned | none | - | Publishes a Multi-View Description (MVPK). |
| `quality/review-pattern` | Quality | E.19 | - | planned | none | - | Reviews a Pattern for freshness/quality. |
| `domain/survey-landscape` | Domain | F.1 | - | planned | none | - | Surveys a Domain Family Landscape. |
| `domain/harvest-terms` | Domain | F.2 | - | planned | none | - | Harvests terms from raw sources. |
| `domain/cluster-senses` | Domain | F.3 | - | planned | none | - | Clusters terms into SenseCells. |
| `design/define-role` | Design | F.4 | - | planned | none | - | Defines a Role Template (RCS/RSG). |
| `domain/construct-concept-set` | Domain | F.7 | - | planned | none | - | Constructs a Concept-Set Table. |
| `domain/decide-mint-reuse` | Domain | F.8 | - | planned | none | - | Decision support for Mint vs Reuse. |
| `domain/align-bridge` | Domain | F.9 | - | planned | none | - | Creates an Alignment/Bridge between contexts. |
| `governance/bind-service` | Governance | F.12 | - | planned | none | - | Binds Service Acceptance (SLO/SLA). |
| `audit/validate-scr` | Audit | F.15 | audit/validate-scr | planned | none | - | Validates SCR/RSCR Harness. |
| `domain/generate-uts` | Domain | F.17 | - | planned | none | - | Generates a Unified Term Sheet (UTS). |
| `so-ta/generate-frame` | SoTA | G.1 | - | planned | none | - | Generates a CG-Frame for a domain. |
| `so-ta/harvest-sota` | SoTA | G.2 | - | planned | none | - | Harvests SoTA literature/claims. |
| `design/author-chr` | Design | G.3 | - | planned | none | - | Authors a Characteristic (Metric). |
| `design/author-cal` | Design | G.4 | - | planned | none | - | Authors a Calculus (Logic/Rules). |
| `runtime/dispatch-method` | Runtime | G.5 | - | planned | none | - | Dispatches to a MethodFamily variant. |
| `audit/benchmark-parity` | Audit | G.9 | audit/benchmark-parity | planned | none | - | Runs a Parity Benchmark. |
| `release/ship-sota-pack` | Release | G.10 | - | planned | none | - | Ships a SoTA Pack (Release). |
| `maintenance/refresh-models` | Maintenance | G.11 | - | planned | none | - | Refreshes stale models based on telemetry. |
| `telemetry/generate-dhc` | Telemetry | G.12 | - | planned | none | - | Generates a Discipline-Health Dashboard. |
