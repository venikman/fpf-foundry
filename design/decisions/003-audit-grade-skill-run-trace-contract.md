# 003. Audit-Grade Skill Run Trace Contract

## Status

**Proposed** on 2026-01-14

## Context

We want to scale the number of Skills without accumulating epistemic debt (B.3.4) and without creating an unauditable tool zoo.

Right now, a “Skill” has three separable layers:

1. **MethodDescription**: the recipe (`design/skills/**/skill.json` + `design/skills/**/SKILL.md`).
2. **Execution**: a concrete run (code under `develop/skills/src/**/index.ts`).
3. **Work**: the dated occurrence record of “what actually happened” (A.15.1).

Without a strict linkage between (1) and (3), we cannot reliably answer:

- Which MethodDescription (edition + file) was executed?
- Under which RoleAssignment?
- What inputs were bound (at least as a stable digest)?
- What artifacts were produced?
- Which decisions justified/authorized the run (optional)?

This blocks safe scale-up because we cannot mechanically enforce A.15 (Role–Method–Work alignment) across Skills.

## Decision

We adopt the following contract for Skill execution tracing.

### D1. Every Skill run MUST emit a U.Work record

Every successful execution of an implemented Skill (inventory `Impl=code`) MUST attempt to create a `U.Work` record using `telemetry/log-work`.

Failure to emit Work SHOULD be treated as a build-breaker at the repo level once the logging path is stable and deterministic in CI.

### D2. Work records MUST be link-complete (A.15 alignment)

Every emitted `U.Work` record MUST include these link anchors:

1. `method_description_ref` (Work → MethodDescription)
   - MUST identify the MethodDescription id (Skill id).
   - SHOULD include the repo path to the SkillSpec (`design/skills/<skill-id>/skill.json`) when resolvable.
   - SHOULD include the pinned version when known.
2. `role_assignment_ref` (Work → RoleAssignment)
   - SHOULD identify the performer under an explicit RoleAssignment identifier.
3. `related_decisions` (Work → DRR) (optional)
   - MAY link to DRR ids or repo paths under `design/decisions/`.

### D3. Work records MUST be audit-grade on inputs/outputs (minimal)

Every emitted `U.Work` record MUST include:

- `inputs_digest`: a deterministic hash (e.g., `sha256`) over a normalized representation of the bound inputs (excluding timestamps).
- `outputs`: a list of primary produced artifact paths (repo-relative or runtime-relative).

### D4. Conformance is enforced mechanically (E.19)

Every SkillSpec MUST declare a small conformance checklist, and repository validation MUST fail hard when checklist fields are missing.

This prevents “paper conformance” where a checklist exists but does not block merges.

## Rationale

- **A.15 correctness**: Work is the only accountable “did” event; without explicit MethodDescription + RoleAssignment links, Work collapses into generic logging and cannot support audit.
- **B.5 loop closure**: the contract enables a Propose → Analyze → Test loop where each change can be traced to the recipe used and artifacts produced.
- **E.13 pragmatism**: the contract is intentionally minimal (digest + outputs + links) to keep overhead low while still being audit-grade.

## Consequences

### Positive

- [x] Skill creation and execution become auditable by default.
- [x] Scaling Skills does not silently increase epistemic debt because traces remain link-complete.
- [x] Inventory/validation can enforce conformance without human memory.

### Negative

- [x] Skills must carry a small amount of extra plumbing (pass method/role_assignment/outputs into `telemetry/log-work`).
- [x] Some runs may not know a strong RoleAssignment identifier; we accept best-effort values initially.
- [x] Work logs increase in volume; mitigation is deterministic naming + digesting and (later) optional aggregation.

## Compliance

- [x] **E.9 DRR**: Follows the standard Context-Decision-Rationale-Consequences format.
