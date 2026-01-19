# Rule of Constraints Spec (U.RuleOfConstraints)

## Status

Draft on 2026-01-18

## Purpose
Define the explicit constraints, approvals, and escalation rules that govern agent sessions in the AgentWorkflow context.

## Scope
- Captures allowed actions, prohibitions, and required approvals.
- Provides deterministic policy references for compliance checks.
- Does not prescribe enforcement tooling or UI.

## Schema (draft, v0.1.0)

```json
{
  "schema_version": "0.1.0",
  "type": "U.RuleOfConstraints",
  "version": "0.1.0",
  "context": "AgentWorkflow",
  "roc_id": "roc-agentworkflow-default",
  "constraints": [
    "No destructive git commands",
    "Tests must pass before success"
  ],
  "permissions": {
    "allowed_tools": ["rg", "bun"],
    "forbidden_tools": ["git reset --hard"]
  },
  "approvals": {
    "required_for": ["schema_changes", "policy_changes"],
    "approver_role": "strategist"
  },
  "escalations": {
    "trigger_on": ["blocked", "policy_conflict"],
    "target": "human"
  },
  "evolution_policy": {
    "status": "reserved",
    "notes": "Reserved for C.18 evolution policy fields; not enforced yet."
  }
}
```

## Validation rules (stub)
- `schema_version`, `type`, `version`, `context`, and `roc_id` are required.
- `constraints` must be an array of strings.
- `permissions`, `approvals`, and `escalations` are objects when present.
- `evolution_policy` is reserved for future use and must not drive behavior yet.

## Example (draft)

```yaml
schema_version: "0.1.0"
type: U.RuleOfConstraints
version: "0.1.0"
context: AgentWorkflow
roc_id: roc-agentworkflow-default
constraints:
  - No destructive git commands.
  - Tests must pass before marking success.
permissions:
  allowed_tools:
    - rg
    - bun
  forbidden_tools:
    - git reset --hard
approvals:
  required_for:
    - schema_changes
    - policy_changes
  approver_role: strategist
escalations:
  trigger_on:
    - blocked
    - policy_conflict
  target: human
evolution_policy:
  status: reserved
  notes: Reserved for C.18 evolution policy fields; not enforced yet.
```
