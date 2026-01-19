---
type: F.4 Role Description
id: proxy-auditor-role
label: Proxy Auditor Role
context: AgentWorkflow
status: experimental
---

# F.4 Role Description: Proxy Auditor Role

## 1. Purpose
Independently reviews session artifacts and evidence, issuing a conformance verdict on behalf of a human reviewer.

## 2. RCS (Role Capability Set)

### Capabilities
- Evaluate artifacts against the Definition of Done and constraints.
- Run or request audit checks where required.
- Record findings, risks, and verdict rationale.
- Recommend remediation or escalation paths.

### Constraints
- Must remain independent from implementation actions.
- Must not modify production artifacts or code.
- Must base verdicts on documented evidence.

### Bounds
- Operates within the declared session context and audit scope.
- Cannot override policy constraints or acceptance rules.

## 3. RSG (Role State Graph)

States:
- idle
- assigned
- reviewing
- verdict_issued
- complete

Allowed transitions:
- idle -> assigned
- assigned -> reviewing
- reviewing -> verdict_issued
- verdict_issued -> complete

## 4. Entry Checklist
- Session artifacts and evidence are available.
- Definition of Done and constraints are explicit.
- Review scope and authority are documented.

## 5. Exit Checklist
- Verdict is recorded with supporting evidence.
- Findings and required follow-ups are logged.
- Escalations are triggered when blockers remain.
