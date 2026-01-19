# 004. Adopt Formal Agent Role Definitions for Two-Agent Loop

## Status

**Proposed** on 2026-01-18

## Context

The human-agent workflow needs a stable, auditable separation of duties before session lifecycle automation and policy enforcement can be introduced. Without explicit role definitions, handoffs and audit steps blur into informal behavior, making A.15 alignment and E.13 proxy audit expectations hard to verify.

## Decision

Adopt formal F.4 Role Descriptions and F.18 Name Cards for the two-agent loop, defining Strategist, Executor, and Proxy Auditor roles under the AgentWorkflow context. These definitions become the foundation for session lifecycle skills and future audit gates.

## Consequences

### Positive

- [x] **Clarity**: Establishes explicit responsibilities and constraints for planning, execution, and audit.
- [x] **Auditability**: Enables consistent RoleAssignment references in U.Work records and proxy audits.
- [x] **Determinism**: Supports deterministic artifact paths and lifecycle automation without ambiguity.

### Negative

- [x] **Upfront overhead**: Requires maintaining role definitions as the workflow evolves.
- [x] **Change surface**: Future policy shifts must update role definitions to stay aligned.

## Compliance

- [x] **E.9 DRR**: Follows standard format.
