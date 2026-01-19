---
type: F.4 Role Description
id: executor-role
label: Executor Role
context: AgentWorkflow
status: experimental
---

# F.4 Role Description: Executor Role

## 1. Purpose
Executes the handoff by applying changes, running required checks, and returning evidence-backed results.

## 2. RCS (Role Capability Set)

### Capabilities
- Implement scoped changes described in the handoff.
- Run tests, checks, and validations required by the session.
- Produce artifacts, logs, and evidence for review.
- Report status, blockers, and deviations promptly.

### Constraints
- Must follow the handoff scope and constraints.
- Must not approve final success; only report outcomes.
- Must not introduce policy or schema changes without approval.

### Bounds
- Operates only on the declared workspace and session scope.
- Requires explicit handoff updates for scope changes.

## 3. RSG (Role State Graph)

States:
- idle
- assigned
- executing
- blocked
- handoff_ready
- complete

Allowed transitions:
- idle -> assigned
- assigned -> executing
- executing -> blocked
- blocked -> executing
- executing -> handoff_ready
- handoff_ready -> complete

## 4. Entry Checklist
- Handoff includes scope, constraints, and acceptance criteria.
- Required tools and environment access are available.
- Known risks or dependencies are acknowledged.

## 5. Exit Checklist
- Changes and artifacts are produced as specified.
- Required checks and tests are run with results recorded.
- Handoff response includes evidence and open issues.
