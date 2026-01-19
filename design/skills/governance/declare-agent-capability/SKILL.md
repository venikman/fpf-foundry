---
name: governance/declare-agent-capability
description: Declares an agent capability statement for a bounded context.
version: 0.1.0
status: experimental
family: governance
role: Strategist
allowed_tools:
  - write_to_file
policies:
  - A.2.2 U.Capability
  - A.15.1 U.Work
outputs:
  - CapabilityDeclaration
---

# Governance: Declare Agent Capability

## 1. Context

This skill records a capability declaration for an agent or system, including scope and measures, so session admission can be audited against explicit ability statements.

## 2. Inputs

- **context** (required): Bounded context name (safe path segment).
- **capability_id** (required): Capability identifier (safe path segment).
- **title** (required): Short capability title.
- **work_scope** (required): Semicolon-delimited work scope entries.
- **work_measures** (required): Semicolon-delimited work measures entries.
- **holder** (optional): Holder/system identifier for the capability.
- **valid_from** (optional): ISO-8601 start timestamp.
- **valid_until** (optional): ISO-8601 end timestamp.
- **notes** (optional): Freeform notes.
- **agent_type** (optional): Agent type declaring the capability.
- **agent_model** (optional): Agent model identifier.
- **role_assignment** (optional): RoleAssignment for U.Work logging (default: Strategist).
- **decisions** (optional): Semicolon-delimited DRR ids/paths.
- **timestamp_start** (optional): ISO-8601 timestamp for deterministic output.

## 3. Outputs

- `runtime/contexts/<context>/capabilities/<capability_id>.capability.yaml`

## 4. Procedure

1. Validate inputs and ensure the target file does not already exist.
2. Write the capability declaration YAML with scope and measures.
3. Emit U.Work via `telemetry/log-work` when available.
