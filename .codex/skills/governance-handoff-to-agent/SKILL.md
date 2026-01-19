---
name: governance/handoff-to-agent
description: Records a handoff to another agent role within a session.
version: 0.1.0
status: experimental
family: governance
role: Strategist
allowed-tools:
  - list_dir
  - write_to_file
policies:
  - A.15.1 U.Work
outputs:
  - HandoffRecord
---

# Governance: Handoff To Agent

## 1. Context

This skill records a structured handoff artifact for a session, targeting a specific agent role and incrementing a deterministic counter.

## 2. Inputs

- **context** (required): Bounded context name (safe path segment).
- **session_id** (required): Session identifier (safe path segment).
- **from_agent_type** (optional): Issuing agent type (default: strategist).
- **to_agent_type** (required): Receiving agent type (safe path segment).
- **instructions** (optional): Semicolon-delimited instructions.
- **acceptance_criteria** (optional): Semicolon-delimited acceptance criteria.
- **constraints** (optional): Semicolon-delimited constraints.
- **artifacts** (optional): Semicolon-delimited artifact paths.
- **notes** (optional): Freeform notes.
- **agent_model** (optional): Agent model identifier.
- **role_assignment** (optional): RoleAssignment for U.Work logging (default: Strategist).
- **decisions** (optional): Semicolon-delimited DRR ids/paths.
- **timestamp_start** (optional): ISO-8601 timestamp for deterministic output.

## 3. Outputs

- `runtime/contexts/<context>/handoffs/<session_id>.<to_agent_type>.<n>.handoff.yaml`

## 4. Procedure

1. Validate inputs and ensure the session record exists.
2. Determine the next handoff counter for the target agent type.
3. Write the handoff YAML record.
4. Emit U.Work via `telemetry/log-work` when available.
