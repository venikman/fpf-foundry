---
name: workflow/generate-handoff
description: Generates a structured handoff artifact with guard rails.
version: 0.1.0
status: experimental
family: workflow
role: Strategist
allowed-tools:
  - list_dir
  - write_to_file
policies:
  - A.15.1 U.Work
outputs:
  - HandoffRecord
---

# Workflow: Generate Handoff

## 1. Context

This skill generates a structured handoff artifact with validated instructions and guard rails, producing deterministic file paths.

## 2. Inputs

- **context** (required): Bounded context name (safe path segment).
- **session_id** (required): Session identifier (safe path segment).
- **from_agent_type** (optional): Issuing agent type (default: strategist).
- **to_agent_type** (required): Receiving agent type (safe path segment).
- **instructions** (required): Semicolon-delimited instructions.
- **acceptance_criteria** (optional): Semicolon-delimited acceptance criteria.
- **constraints** (optional): Semicolon-delimited constraints.
- **prohibited_actions** (optional): Semicolon-delimited prohibited actions.
- **artifacts** (optional): Semicolon-delimited artifact paths.
- **notes** (optional): Freeform notes.
- **agent_model** (optional): Agent model identifier.
- **role_assignment** (optional): RoleAssignment for U.Work logging (default: Strategist).
- **decisions** (optional): Semicolon-delimited DRR ids/paths.
- **timestamp_start** (optional): ISO-8601 timestamp for deterministic output.

## 3. Outputs

- `runtime/contexts/<context>/handoffs/<session_id>.<to_agent_type>.<n>.handoff.yaml`

## 4. Procedure

1. Validate inputs and ensure guard rails are present.
2. Determine the next handoff counter for the target agent type.
3. Write the handoff YAML record.
4. Emit U.Work via `telemetry/log-work` when available.
