# Agent Handoff Spec (U.AgentHandoff)

## Status

Draft on 2026-01-18

## Purpose
Define the minimal, deterministic structure of a handoff artifact used to transfer work between roles in the AgentWorkflow context.

## Scope
- Covers required fields, validation rules, and versioning.
- Does not define transport, storage backend, or automation behavior.

## Schema (v0.1.0)

```json
{
  "schema_version": "0.1.0",
  "type": "U.AgentHandoff",
  "version": "0.1.0",
  "context": "AgentWorkflow",
  "session_id": "SESSION-001",
  "handoff_id": "SESSION-001.executor.1",
  "from_agent_type": "strategist",
  "to_agent_type": "executor",
  "issued_at": "2026-01-18T00:00:00Z",
  "instructions": [
    "Describe the tasks to complete",
    "List required checks"
  ],
  "acceptance_criteria": [
    "Tests pass",
    "Artifacts updated"
  ],
  "constraints": [
    "No scope expansion",
    "Do not modify schemas"
  ],
  "prohibited_actions": [
    "Do not run destructive commands"
  ],
  "artifacts": [
    "runtime/contexts/AgentWorkflow/design/roles/executor-role.md"
  ],
  "notes": "Optional freeform notes.",
  "x-custom-key": "Extension keys must use the x-* prefix."
}
```

## Validation rules
- `schema_version`, `type`, `version`, `context`, `session_id`, `handoff_id`, `from_agent_type`, and `to_agent_type` are required.
- `from_agent_type` and `to_agent_type` are constrained to the AgentWorkflow role set.
- Arrays must be present even if empty for `instructions`, `acceptance_criteria`, `constraints`, and `artifacts`.
- `prohibited_actions` is optional but must be an array when present.
- `notes` is optional and must be a string when present.
- Unknown keys are rejected unless they use the `x-*` extension prefix.

## Example

```yaml
schema_version: "0.1.0"
type: U.AgentHandoff
version: "0.1.0"
context: AgentWorkflow
session_id: AW-2026-01-18-001
handoff_id: AW-2026-01-18-001.executor.1
from_agent_type: strategist
to_agent_type: executor
issued_at: 2026-01-18T10:15:00Z
instructions:
  - Update role descriptions for AgentWorkflow.
  - Add the new decision record and spec stubs.
acceptance_criteria:
  - New artifacts are committed under the AgentWorkflow context.
  - Inventory and decision numbering remain consistent.
constraints:
  - Do not change runtime behavior.
prohibited_actions:
  - Do not run destructive commands.
artifacts:
  - design/decisions/004-adopt-formal-agent-role-definitions-for-two-agent-loop.md
notes: Updated role definitions and specs are included.
x-release: draft
```
