---
name: workflow/escalate-to-human
description: Escalates a session issue to a human reviewer.
version: 0.1.0
status: experimental
family: workflow
role: Strategist
allowed-tools:
  - list_dir
  - write_to_file
policies:
  - E.16 RoC-Autonomy
  - A.15.1 U.Work
outputs:
  - EscalationRecord
---

# Workflow: Escalate to Human

## 1. Context

This skill records a human escalation request for a session issue, capturing severity, target, and related artifacts.

## 2. Inputs

- **context** (required): Bounded context name (safe path segment).
- **session_id** (required): Session identifier (safe path segment).
- **reason** (required): Escalation reason or trigger summary.
- **severity** (optional): Escalation severity (`low`, `medium`, `high`).
- **target** (optional): Escalation target (default: human).
- **requested_by** (optional): Requester label.
- **artifacts** (optional): Semicolon-delimited artifact paths.
- **notes** (optional): Freeform notes.
- **agent_model** (optional): Agent model identifier.
- **role_assignment** (optional): RoleAssignment for U.Work logging (default: Strategist).
- **decisions** (optional): Semicolon-delimited DRR ids/paths.
- **timestamp_start** (optional): ISO-8601 timestamp for deterministic output.

## 3. Outputs

- `runtime/contexts/<context>/escalations/<session_id>.<n>.escalation.md`

## 4. Procedure

1. Validate inputs and compute the next escalation index.
2. Write the escalation record with status open.
3. Emit U.Work via `telemetry/log-work` when available.
