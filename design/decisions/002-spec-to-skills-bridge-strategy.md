# 002. FPF Spec-to-Skills Bridge Strategy

## Status

**Proposed** on 2026-01-11

## Context

The **FPF Specification** (Part A-G) defines the *Laws* and *Patterns* of the framework. The **FPF Skill Stack** provides the *Runtime* and *Capabilities* to execute these patterns.

Currently, there is a gap: we have the Outline (`design/specs/FPF_Spec_Outline.md`) but no executable Skills implementing these patterns. We need a systematic way to transform normative FPF Patterns into executable `SKILL.md` definitions.

## Decision

We will adopt the **Standard 3.0 Spec-to-Skills Methodology** with the following specific rules:

### 1. The "Verb Test" Selection Criteria

We will only mint Skills for Patterns that pass the "Verb Test":

* **Method / Process (Verb)**: Patterns describing an action (e.g., "How to Mint", "How to Log") **SHALL** become Skills.
* **Ontology / Type (Noun)**: Patterns describing definitions (e.g., "Holon", "Role") **SHALL NOT** become Skills (they are Types).
* **Metric (Measurement)**: Patterns describing scales or audits **SHALL** become Skills.

### 2. Centralized Inventory Location

We will initialize the central skill registry at:
`design/skills/SKILL_INVENTORY.md`

This adheres strictly to the FPF Context structure, ensuring the `Skills` context manages its own design artifacts.

### 3. Policy Realization Strategy

Patterns that represent Laws (Constraints) will be handled via:

* **Passive Constraints**: Embedded in `SKILL.md` frontmatter (e.g., `policies` list) or Prerequisite Injection.
* **Active Auditors**: Dedicated "Audit" Skills (e.g., `design/audit-lexicon`) that verify compliance.

## Mapping semantics (pattern <-> skill)

A spec pattern MAY map to zero, one, or many Skills (0..N).
A Skill MAY satisfy zero, one, or many spec patterns (0..N).

Rationale: patterns often decompose into multiple executable verbs, and some Skills are reusable primitives referenced by many patterns.

## Constraint realization rule

Every constraint pattern MUST declare exactly one realization strategy:

1) Passive gating: enforced by static checks or frontmatter/tool-gating in the implementing Skill(s).
2) Active audit: enforced by a dedicated `audit/*` Skill that evaluates the work/result.

The Skill Inventory row(s) referencing a constraint pattern MUST include a pointer to the chosen realization:
- `PolicyRealization: passive`
- `PolicyRealization: audit/<skill-id>`

## Definition of done (bridge is "live")

The bridge strategy is considered implemented when all are true:

- Every inventory row with `Impl != none` has a corresponding `design/skills/<skill-id>/SKILL.md` (or documented equivalent).
- Every `status=experimental` or `status=stable` Skill is invokable and emits a `U.Work` record.
- Every referenced constraint pattern has a `PolicyRealization` entry and it resolves to either passive gating or an existing `audit/*` Skill.
- Inventory and filesystem are consistent for implemented skills (no "orphan" skills and no "phantom" inventory rows).

Automated validation coverage: `develop/scripts/skill_inventory_checks.js` enforces items 1, 2, and 4 and validates `PolicyRealization` value format when present; constraint-pattern coverage remains manual until constraints are tagged in the inventory.

## Rationale

* **Executability**: A Skill is formally a `U.MethodDescription` (a recipe). It must produce a `U.Work` record. Nouns cannot produce work; only Verbs can. Therefore, the "Verb Test" is the only logical filter for the Bridge.
* **Traceability**: Placing the inventory in `design/skills` ensures that the "Skills" context is self-contained. If we placed it at the root, we would violate the `A.7 Strict Distinction` between the Foundry (Root) and the Contexts (Workspaces).
* **Enforcement**: We cannot "execute" a law like "Do not depend on tools". We can only "audit" it or "constrain" it. Separating these strategies prevents us from trying to write impossible code.

## Consequences

### Positive

* [x] **Clear Roadmap**: The "Verb Test" instantly filters the 100+ patterns down to a manageable list of executable skills.
* [x] **Auditability**: Every generated Skill will trace back to a specific Spec Section (e.g., `Ref: F.18`).
* [x] **Architectural Purity**: Keeping the inventory in `design/skills` maintains the fractal structure of the Holarchy.

### Negative

* [x] **Visibility Friction**: The inventory is buried 2 levels deep (`design/skills`), making it less "in your face" than a root file.
* [x] **Maintenance Overhead**: We must manually keep the Inventory in sync with the Spec until we build an automated `design/sync-spec` skill.
* [x] **Drift Risk**: Without an explicit realization pointer (passive vs audit), constraint patterns will drift and become non-auditable.

## Compliance

* [x] **E.9 DRR**: Follows the standard Context-Decision-Rationale-Consequences format.
