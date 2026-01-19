# Agent Handoff Spec (U.AgentHandoff)

## Status

Draft on 2026-01-18

## Purpose
Define the minimal, deterministic structure of a handoff artifact used to transfer work between roles in the AgentWorkflow context.

## Scope
- Covers required fields, validation rules, and versioning.
- Does not define transport, storage backend, or automation behavior.

## Schema (draft, v0.1.0)

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
  "artifacts": [
    {
      "path": "runtime/contexts/AgentWorkflow/design/roles/executor-role.md",
      "description": "Role definition used for this handoff"
    }
  ],
  "x_extensions": {}
}
```

## Validation rules (stub)
- `schema_version`, `type`, `version`, `context`, `session_id`, `handoff_id`, `from_agent_type`, and `to_agent_type` are required.
- `from_agent_type` and `to_agent_type` are constrained to the AgentWorkflow role set.
- Arrays must be present even if empty for `instructions`, `acceptance_criteria`, and `constraints`.
- Unknown keys are rejected unless they are placed under `x_extensions`.

## Example (draft)

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
artifacts:
  - path: design/decisions/004-adopt-formal-agent-role-definitions-for-two-agent-loop.md
    description: New decision record.
x_extensions: {}
```
