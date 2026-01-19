---
name: governance/complete-agent-session
description: Completes an agent session with status and summary.
version: 0.1.2
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
- **dod_report** (optional): Path to a DoD report (required to mark `success`).
- **roc_report** (optional): Path to a RoC compliance report.
- **roc_path** (optional): Path to a RoC policy file (used to generate a compliance report).
- **used_tools** (optional): Semicolon-delimited tools used during the session (for RoC checks).
- **approvals** (optional): Semicolon-delimited approval keys satisfied (for RoC checks).
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
2. If status is `success`, require a DoD report with pass status or downgrade to `needs-review`.
3. Evaluate RoC compliance when provided and apply violation outcomes.
4. Update front matter with completion status and timestamp.
5. Append a completion section with summary.
6. Emit U.Work via `telemetry/log-work` when available.
