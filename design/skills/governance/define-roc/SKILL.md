---
name: governance/define-roc
description: Defines a Rule of Constraints policy bundle for agent autonomy.
version: 0.1.0
status: experimental
family: governance
role: Strategist
allowed_tools:
  - write_to_file
policies:
  - E.16 RoC-Autonomy
  - A.15.1 U.Work
outputs:
  - RoCSpec
---

# Governance: Define Rule of Constraints

## 1. Context

This skill creates a Rule of Constraints (RoC) policy bundle that defines guard rails, approvals, and escalation triggers for a bounded context.

## 2. Inputs

- **context** (required): Bounded context name (safe path segment).
- **roc_id** (required): RoC identifier (safe path segment).
- **constraints** (optional): Semicolon-delimited constraint statements.
- **allowed_tools** (optional): Semicolon-delimited allowed tool list.
- **forbidden_tools** (optional): Semicolon-delimited forbidden tool list.
- **approvals_required_for** (optional): Semicolon-delimited approval requirement keys.
- **approver_role** (optional): Approver role label.
- **escalations_trigger_on** (optional): Semicolon-delimited escalation triggers.
- **escalation_target** (optional): Escalation target (default: human).
- **violation_outcome** (optional): Outcome when violations occur (`blocked` or `needs-review`).
- **evolution_notes** (optional): Reserved evolution policy notes (not enforced).
- **agent_type** (optional): Agent type defining the RoC.
- **agent_model** (optional): Agent model identifier.
- **role_assignment** (optional): RoleAssignment for U.Work logging (default: Strategist).
- **decisions** (optional): Semicolon-delimited DRR ids/paths.
- **timestamp_start** (optional): ISO-8601 timestamp for deterministic output.

## 3. Outputs

- `runtime/contexts/<context>/roc/<roc_id>.roc.yaml`

## 4. Procedure

1. Validate inputs and ensure the RoC contains at least one policy section.
2. Write the RoC YAML file.
3. Emit U.Work via `telemetry/log-work` when available.
