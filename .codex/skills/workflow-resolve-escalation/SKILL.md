---
name: workflow/resolve-escalation
description: Records a resolution for a human escalation.
version: 0.1.0
status: experimental
family: workflow
role: Strategist
allowed-tools:
  - view_file
  - write_to_file
policies:
  - E.16 RoC-Autonomy
  - A.15.1 U.Work
outputs:
  - EscalationResolution
---

# Workflow: Resolve Escalation

## 1. Context

This skill records a resolution decision for a previously raised escalation without altering the original escalation record.

## 2. Inputs

- **context** (required): Bounded context name (safe path segment).
- **escalation_id** (required): Escalation identifier (safe path segment; may include dots).
- **decision** (required): Resolution decision (`resolved`, `needs-review`, `blocked`).
- **resolved_by** (optional): Resolver label (person or role).
- **notes** (optional): Freeform notes.
- **agent_model** (optional): Agent model identifier.
- **role_assignment** (optional): RoleAssignment for U.Work logging (default: Strategist).
- **decisions** (optional): Semicolon-delimited DRR ids/paths.
- **timestamp_start** (optional): ISO-8601 timestamp for deterministic output.

## 3. Outputs

- `runtime/contexts/<context>/escalations/<escalation_id>.<timestamp>.resolution.md`

## 4. Procedure

1. Validate inputs and confirm the escalation record exists.
2. Write the resolution record with the decision and notes.
3. Emit U.Work via `telemetry/log-work` when available.
