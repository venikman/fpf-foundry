---
name: audit/proxy-audit-session
description: Issues a proxy audit verdict for a session.
version: 0.1.0
status: experimental
family: audit
role: ProxyAuditor
allowed-tools:
  - write_to_file
policies:
  - E.13 Proxy audit
  - A.15.1 U.Work
outputs:
  - ProxyAuditReport
---

# Audit: Proxy Audit Session

## 1. Context

This skill records a proxy audit verdict for a session, capturing findings and recommendations without changing the session state.

## 2. Inputs

- **context** (required): Bounded context name (safe path segment).
- **session_id** (required): Session identifier (safe path segment).
- **verdict** (required): Proxy audit verdict (`pass`, `needs-review`, `fail`).
- **findings** (optional): Semicolon-delimited findings.
- **recommendations** (optional): Semicolon-delimited recommendations.
- **artifacts** (optional): Semicolon-delimited artifact paths.
- **dod_report** (optional): Path to a DoD report.
- **notes** (optional): Freeform notes.
- **agent_type** (optional): Agent type performing the audit.
- **agent_model** (optional): Agent model identifier.
- **role_assignment** (optional): RoleAssignment for U.Work logging (default: ProxyAuditor).
- **decisions** (optional): Semicolon-delimited DRR ids/paths.
- **timestamp_start** (optional): ISO-8601 timestamp for deterministic output.

## 3. Outputs

- `runtime/contexts/<context>/audits/proxy/<session_id>.<timestamp>.proxy-audit.md`

## 4. Procedure

1. Validate inputs and resolve the proxy audit report path.
2. Write the proxy audit report with verdict and structured feedback.
3. Emit U.Work via `telemetry/log-work` when available.
