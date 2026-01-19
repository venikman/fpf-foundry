---
name: governance/complete-agent-session
description: Completes an agent session with status and summary.
version: 0.1.0
status: experimental
family: governance
role: Strategist
allowed_tools:
  - view_file
  - write_to_file
policies:
  - A.15.1 U.Work
outputs:
  - SessionRecord
---

# Governance: Complete Agent Session

## 1. Context

This skill updates a session record with completion status and summary, leaving a traceable end state for the session lifecycle.

## 2. Inputs

- **context** (required): Bounded context name (safe path segment).
- **session_id** (required): Session identifier (safe path segment).
- **status** (required): Completion status (`success`, `needs-review`, `blocked`, `failed`).
- **summary** (optional): Completion summary.
- **agent_type** (optional): Agent type completing the session.
- **agent_model** (optional): Agent model identifier.
- **role_assignment** (optional): RoleAssignment for U.Work logging (default: Strategist).
- **decisions** (optional): Semicolon-delimited DRR ids/paths.
- **timestamp_start** (optional): ISO-8601 timestamp for deterministic output.

## 3. Outputs

- `runtime/contexts/<context>/sessions/<session_id>.session.md`

## 4. Procedure

1. Validate inputs and confirm the session record exists.
2. Update front matter with completion status and timestamp.
3. Append a completion section with summary.
4. Emit U.Work via `telemetry/log-work` when available.
