---
name: workflow/parse-handoff
description: Parses and validates a handoff artifact into canonical JSON.
version: 0.1.0
status: experimental
family: workflow
role: ProxyAuditor
allowed-tools:
  - view_file
  - write_to_file
policies:
  - A.15.1 U.Work
outputs:
  - ParsedHandoff
---

# Workflow: Parse Handoff

## 1. Context

This skill parses a handoff YAML file, validates it against the U.AgentHandoff schema, and writes a canonical JSON representation.

## 2. Inputs

- **handoff_path** (required): Path to the handoff YAML file.
- **output_path** (optional): Override output path for parsed JSON.
- **agent_type** (optional): Agent type performing the parse.
- **agent_model** (optional): Agent model identifier.
- **role_assignment** (optional): RoleAssignment for U.Work logging (default: ProxyAuditor).
- **decisions** (optional): Semicolon-delimited DRR ids/paths.
- **timestamp_start** (optional): ISO-8601 timestamp for deterministic output.

## 3. Outputs

- Parsed JSON file (default: `runtime/contexts/<context>/handoffs/<handoff_id>.parsed.json`).

## 4. Procedure

1. Load and parse the handoff YAML.
2. Validate required fields, agent types, and list shapes.
3. Write canonical JSON output.
4. Emit U.Work via `telemetry/log-work` when available.
