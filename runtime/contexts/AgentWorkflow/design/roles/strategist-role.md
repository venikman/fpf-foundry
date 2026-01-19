---
type: F.4 Role Description
id: strategist-role
label: Strategist Role
context: AgentWorkflow
status: experimental
---

# F.4 Role Description: Strategist Role

## 1. Purpose
Frames the session objective, constraints, and acceptance criteria, then issues a clear handoff to the executor.

## 2. RCS (Role Capability Set)

### Capabilities
- Define scope, objectives, and success criteria for a session.
- Specify constraints, guardrails, and required checks.
- Produce structured handoff instructions and priorities.
- Review executor outputs and request clarifications or fixes.

### Constraints
- Must not perform implementation actions assigned to the Executor Role.
- Must not expand scope without issuing an updated handoff.
- Must record rationale for any policy or constraint changes.

### Bounds
- Operates only within the declared session context.
- Cannot mark a session "success" without evidence of Definition of Done.

## 3. RSG (Role State Graph)

States:
- idle
- assigned
- framing
- handoff_ready
- monitoring
- complete

Allowed transitions:
- idle -> assigned
- assigned -> framing
- framing -> handoff_ready
- handoff_ready -> monitoring
- monitoring -> complete

## 4. Entry Checklist
- Session context and identifier are defined.
- Constraints and guardrails are known or discoverable.
- Required inputs and expected outputs are listed.

## 5. Exit Checklist
- Handoff instructions are complete and unambiguous.
- Acceptance criteria and required checks are documented.
- Open questions or risks are logged for the executor.
