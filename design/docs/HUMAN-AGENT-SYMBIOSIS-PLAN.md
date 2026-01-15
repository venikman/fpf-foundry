# FPF-Foundry Human-Agent Symbiosis Improvement Plan

## Executive Summary

This plan outlines actionable steps to improve FPF-Foundry for cleaner human-agent symbiosis, based on analysis of the FPF Specification, the proposed AGENTS.md two-agent workflow (Strategist/Executor pattern), and the current fpf-foundry implementation. The goal is to create a robust, auditable, and scalable framework where humans and AI agents collaborate effectively while maintaining FPF's core principles of accountability, traceability, and separation of concerns.

---

## Part 1: Foundation - Formalizing the Two-Agent Loop

### 1.1 Create Agent Role Definitions (Priority: High)

**Current Gap**: The AGENTS.md describes Strategist (Claude) and Executor (Codex) roles conceptually, but there are no formal FPF Role Descriptions (F.4) for these agent roles.

**Actions**:

1. **Mint Name Cards for Agent Roles** (F.18)
   - `strategist-role` - "A behavioral role for AI agents responsible for objective framing, edge-case analysis, security review, and proxy audits"
   - `executor-role` - "A behavioral role for AI agents responsible for implementation, running commands, generating code, and minting artifacts"
   - `proxy-auditor-role` - "A behavioral role for reviewing and validating work produced by another agent against original intent"

2. **Create Role Descriptions** (F.4) for each agent role with:
   - Role Characterisation Space (RCS): capabilities, constraints, authority bounds
   - Role State Graph (RSG): states like `Idle`, `Active`, `Awaiting-Review`, `Blocked`
   - Checklists: entry/exit criteria for each state

3. **Record DRR**: "Adopt Formal Agent Role Definitions for Two-Agent Loop"

**Implementation Path**:
```bash
# Mint Name Cards
bun develop/skills/src/design/mint-name/index.ts \
  --context AgentWorkflow \
  --id strategist-role \
  --label "Strategist Role" \
  --mds "A behavioral role for AI agents responsible for objective framing, edge-case analysis, security review, and proxy audits (E.13)"

bun develop/skills/src/design/mint-name/index.ts \
  --context AgentWorkflow \
  --id executor-role \
  --label "Executor Role" \
  --mds "A behavioral role for AI agents responsible for implementation, running commands, generating code, and minting artifacts"
```

**Deliverables**:
- `runtime/contexts/AgentWorkflow/design/names/strategist-role.md`
- `runtime/contexts/AgentWorkflow/design/names/executor-role.md`
- `runtime/contexts/AgentWorkflow/design/names/proxy-auditor-role.md`
- `design/decisions/004-formal-agent-role-definitions.md`

---

### 1.2 Implement Agent Session Management (Priority: High)

**Current Gap**: No formal mechanism to track agent sessions, handoffs, or the lifecycle of a two-agent collaboration.

**Actions**:

1. **Create New Skill**: `governance/start-agent-session`
   - Inputs: session_id, agent_type (strategist|executor), context, objective
   - Outputs: session record with RoleAssignment reference
   - Emits: U.Work record for session start

2. **Create New Skill**: `governance/handoff-to-agent`
   - Inputs: from_session_id, to_agent_type, instructions, guard_rails, expected_artifacts
   - Outputs: handoff record with structured instructions
   - Emits: U.Work record for handoff

3. **Create New Skill**: `governance/complete-agent-session`
   - Inputs: session_id, status (success|blocked|needs-review), summary, artifacts_produced
   - Outputs: session completion record
   - Emits: U.Work record for session completion

4. **Create New Skill**: `audit/proxy-audit-session`
   - Inputs: session_id, original_intent, produced_artifacts, verdict (approved|rework|rejected)
   - Outputs: proxy audit record (E.13 compliance)
   - Emits: U.Work record for audit

**SkillSpec Template** (for `governance/start-agent-session`):
```json
{
  "schema_version": "0.1.0",
  "id": "governance/start-agent-session",
  "name": "Start Agent Session",
  "summary": "Initializes a formal agent session with RoleAssignment and tracking.",
  "conformance": {
    "checklist": [
      "inputs_validated",
      "outputs_listed",
      "u_work_emitted",
      "deterministic_naming",
      "inventory_updated"
    ]
  },
  "intent": {
    "goal": "Create an auditable record of an agent session start with formal RoleAssignment.",
    "non_goals": ["Execute agent work", "Manage agent credentials"]
  },
  "inputs": [
    {"name": "session_id", "type": "string", "description": "Unique session identifier", "required": true},
    {"name": "agent_type", "type": "enum", "description": "strategist|executor", "required": true},
    {"name": "context", "type": "string", "description": "Bounded context for the session", "required": true},
    {"name": "objective", "type": "string", "description": "Session objective/goal", "required": true}
  ],
  "outputs": [
    {"name": "session_record_path", "type": "string", "description": "Path to created session record"}
  ],
  "procedure": [
    {"step_id": "validate", "instruction": "Validate session_id uniqueness and agent_type enum"},
    {"step_id": "create-role-assignment", "instruction": "Generate RoleAssignment reference for agent#role:context"},
    {"step_id": "write-session", "instruction": "Write session record to runtime/contexts/<context>/sessions/"},
    {"step_id": "log-work", "instruction": "Emit U.Work record for session start"}
  ],
  "constraints": {
    "safety": ["Session IDs must be unique within context"],
    "privacy": ["Do not log sensitive credentials"],
    "licensing": []
  },
  "dependencies": {
    "tools": ["bun"],
    "skills": ["telemetry/log-work@^0.1.0"]
  },
  "eval": {
    "acceptance_criteria": ["Session record created", "U.Work emitted", "RoleAssignment valid"],
    "tests": [{"name": "basic", "input_fixture": {"session_id": "test-001", "agent_type": "executor", "context": "Test", "objective": "Test session"}, "expected": {"session_record_path": "runtime/contexts/Test/sessions/test-001.session.md"}}]
  },
  "version": "0.1.0",
  "metadata": {
    "tags": ["governance", "agent", "session"],
    "authors": ["FPF Foundry"],
    "created": "2026-01-15",
    "updated": "2026-01-15"
  }
}
```

**Deliverables**:
- `design/skills/governance/start-agent-session/skill.json`
- `design/skills/governance/handoff-to-agent/skill.json`
- `design/skills/governance/complete-agent-session/skill.json`
- `design/skills/audit/proxy-audit-session/skill.json`
- Corresponding implementations in `develop/skills/src/`

---

### 1.3 Enhance U.Work for Agent Metadata (Priority: Medium)

**Current Gap**: The current `telemetry/log-work` skill doesn't capture agent-specific metadata (model version, session ID, agent type).

**Actions**:

1. **Extend log-work inputs** to include optional agent metadata:
   - `--agent-session`: Reference to agent session ID
   - `--agent-model`: Model identifier (e.g., "claude-3.5-sonnet", "codex-2024")
   - `--agent-type`: strategist|executor|proxy-auditor

2. **Update U.Work record format** to include agent metadata section:
   ```yaml
   agent_metadata:
     session_ref: "session-2026-01-15-001"
     model: "claude-3.5-sonnet"
     agent_type: "strategist"
   ```

3. **Maintain backward compatibility**: Agent metadata fields are optional

**Deliverables**:
- Updated `develop/skills/src/telemetry/log-work/index.ts`
- Updated `design/skills/telemetry/log-work/skill.json`
- Updated `.codex/skills/log-work/SKILL.md`

---

## Part 2: Workflow Infrastructure

### 2.1 Create Structured Handoff Artifacts (Priority: High)

**Current Gap**: The AGENTS.md describes handoff protocols conceptually, but there's no structured artifact format for agent-to-agent handoffs.

**Actions**:

1. **Define Handoff Artifact Schema** (new pattern):
   ```yaml
   type: U.AgentHandoff
   from_session: "session-001"
   to_agent_type: "executor"
   timestamp: "2026-01-15T12:00:00Z"
   instructions:
     files_to_modify: ["src/feature.ts", "tests/feature.test.ts"]
     expected_behavior: "Add validation for email input"
     test_expectations: ["Unit tests pass", "Email regex validates correctly"]
     fpf_artifacts_required: ["Name Card for email-validator"]
   guard_rails:
     prohibited_actions: ["Modify package.json without approval"]
     required_checks: ["bun test", "fpf check"]
   context_refs:
     - "design/decisions/003-audit-grade-skill-run-trace-contract.md"
   ```

2. **Create New Skill**: `workflow/generate-handoff`
   - Inputs: from_session, to_agent_type, instructions (structured), guard_rails
   - Outputs: handoff artifact file
   - Validates: Instructions are actionable, guard_rails are enforceable

3. **Create New Skill**: `workflow/parse-handoff`
   - Inputs: handoff_path
   - Outputs: Parsed handoff object for agent consumption
   - Used by: Executor agents to understand their task

**Deliverables**:
- `design/specs/handoff/handoff-spec.md` - Handoff artifact specification
- `design/skills/workflow/generate-handoff/skill.json`
- `design/skills/workflow/parse-handoff/skill.json`

---

### 2.2 Implement Definition of Done Automation (Priority: High)

**Current Gap**: The AGENTS.md defines a "Definition of Done" checklist, but there's no automated skill to verify it.

**Actions**:

1. **Create New Skill**: `audit/verify-definition-of-done`
   - Inputs: session_id, context
   - Checks:
     - `git diff` exists and is non-empty
     - `bun test` passes
     - `fpf check` passes
     - Required FPF artifacts exist (Name Cards, DRRs, Work logs)
   - Outputs: DoD verification report with pass/fail status

2. **Integrate with session completion**: `governance/complete-agent-session` should call `audit/verify-definition-of-done` before marking success

**SkillSpec Outline**:
```json
{
  "id": "audit/verify-definition-of-done",
  "name": "Verify Definition of Done",
  "summary": "Verifies that all Definition of Done requirements are met before task completion.",
  "procedure": [
    {"step_id": "check-diff", "instruction": "Run git diff and verify non-empty changes exist"},
    {"step_id": "run-tests", "instruction": "Execute bun test and capture results"},
    {"step_id": "run-fpf-check", "instruction": "Execute fpf check and verify zero issues"},
    {"step_id": "verify-artifacts", "instruction": "Check for required FPF artifacts based on task type"},
    {"step_id": "generate-report", "instruction": "Generate DoD verification report"}
  ]
}
```

**Deliverables**:
- `design/skills/audit/verify-definition-of-done/skill.json`
- `develop/skills/src/audit/verify-definition-of-done/index.ts`

---

### 2.3 Create Agent Instruction Generator (Priority: Medium)

**Current Gap**: No skill to generate agent-specific instructions from SkillSpec.

**Actions**:

1. **Create New Skill**: `workflow/generate-agent-instructions`
   - Inputs: skill_id, agent_type, context
   - Outputs: Agent-specific instruction document
   - For Codex: Generates `.codex/skills/<skill>/SKILL.md` format
   - For Claude: Generates prompt-friendly instruction format

2. **Unify .codex skills with SkillSpec**: Generate `.codex/skills/` from `design/skills/` automatically

**Deliverables**:
- `design/skills/workflow/generate-agent-instructions/skill.json`
- `develop/skills/src/workflow/generate-agent-instructions/index.ts`
- Updated `bun run check` to verify .codex skills are in sync with SkillSpec

---

## Part 3: Governance and Boundaries

### 3.1 Implement Rule-of-Constraints (RoC) for Agents (Priority: High)

**Current Gap**: No formal mechanism to define and enforce agent boundaries, budgets, and escalation protocols.

**Actions**:

1. **Define RoC Schema** based on FPF-Spec guidance:
   ```yaml
   type: U.RuleOfConstraints
   scope:
     agent_type: "executor"
     context: "FPF"
   budgets:
     max_files_modified: 10
     max_lines_changed: 500
     max_execution_time_minutes: 30
   prohibitions:
     - "Do not modify package.json without approval"
     - "Do not delete existing tests"
     - "Do not commit secrets"
   escalation:
     on_budget_exceed: "pause-and-notify"
     on_prohibition_violation: "abort-and-notify"
     notify_channel: "human-reviewer"
   telemetry:
     log_every_file_change: true
     log_command_execution: true
   ```

2. **Create New Skill**: `governance/define-roc`
   - Inputs: agent_type, context, budgets, prohibitions, escalation
   - Outputs: RoC definition file
   - Validates: Budgets are numeric, prohibitions are actionable

3. **Create New Skill**: `governance/check-roc-compliance`
   - Inputs: session_id, roc_path
   - Outputs: Compliance report with violations (if any)
   - Used by: Agents to self-check before completing work

**Deliverables**:
- `design/specs/roc/rule-of-constraints-spec.md`
- `design/skills/governance/define-roc/skill.json`
- `design/skills/governance/check-roc-compliance/skill.json`

---

### 3.2 Implement Capability Declarations (Priority: Medium)

**Current Gap**: No formal way to declare what an agent can and cannot do within a context.

**Actions**:

1. **Create New Skill**: `governance/declare-agent-capability`
   - Inputs: agent_type, context, capabilities (list), limitations (list)
   - Outputs: Capability declaration file
   - Example capabilities: "can-modify-typescript", "can-run-tests", "can-mint-name-cards"
   - Example limitations: "cannot-access-production", "cannot-modify-ci-config"

2. **Integrate with session start**: `governance/start-agent-session` should reference capability declaration

**Deliverables**:
- `design/skills/governance/declare-agent-capability/skill.json`
- `runtime/contexts/AgentWorkflow/capabilities/executor.capability.md`
- `runtime/contexts/AgentWorkflow/capabilities/strategist.capability.md`

---

### 3.3 Implement Escalation Protocol (Priority: Medium)

**Current Gap**: No formal skill for agent escalation when blocked or uncertain.

**Actions**:

1. **Create New Skill**: `workflow/escalate-to-human`
   - Inputs: session_id, reason, context, options (if any), blocking (true|false)
   - Outputs: Escalation record
   - Emits: U.Work record for escalation

2. **Create New Skill**: `workflow/resolve-escalation`
   - Inputs: escalation_id, resolution, resolved_by
   - Outputs: Resolution record
   - Emits: U.Work record for resolution

**Deliverables**:
- `design/skills/workflow/escalate-to-human/skill.json`
- `design/skills/workflow/resolve-escalation/skill.json`

---

## Part 4: Telemetry and Observability

### 4.1 Create Agent Work Aggregation (Priority: Medium)

**Current Gap**: No skill to aggregate and summarize agent work across sessions.

**Actions**:

1. **Create New Skill**: `telemetry/aggregate-agent-work`
   - Inputs: context, time_range, agent_type (optional)
   - Outputs: Aggregated work summary with:
     - Total sessions
     - Total artifacts produced
     - Success/failure rates
     - Common patterns/issues

2. **Create New Skill**: `telemetry/generate-agent-report`
   - Inputs: context, time_range, format (markdown|json)
   - Outputs: Human-readable report of agent activity

**Deliverables**:
- `design/skills/telemetry/aggregate-agent-work/skill.json`
- `design/skills/telemetry/generate-agent-report/skill.json`

---

### 4.2 Implement Discipline Health Dashboard for Agents (Priority: Low)

**Current Gap**: No DHC (G.12) implementation for agent performance tracking.

**Actions**:

1. **Define Agent DHC Metrics**:
   - Session completion rate
   - Average session duration
   - Artifacts produced per session
   - DoD pass rate on first attempt
   - Escalation frequency
   - Proxy audit approval rate

2. **Create New Skill**: `telemetry/generate-agent-dhc`
   - Inputs: context, time_range
   - Outputs: DHC dashboard data (JSON) and visualization (markdown)

**Deliverables**:
- `design/skills/telemetry/generate-agent-dhc/skill.json`
- `design/specs/dhc/agent-dhc-spec.md`

---

## Part 5: Human-Agent Interface

### 5.1 Create Human-Readable Summaries (Priority: High)

**Current Gap**: No skill to generate human-friendly summaries of agent work.

**Actions**:

1. **Create New Skill**: `publication/summarize-agent-session`
   - Inputs: session_id
   - Outputs: Human-readable summary with:
     - What was requested
     - What was done
     - What artifacts were produced
     - What decisions were made
     - What issues were encountered

2. **Integrate with session completion**: Auto-generate summary on session complete

**Deliverables**:
- `design/skills/publication/summarize-agent-session/skill.json`
- `develop/skills/src/publication/summarize-agent-session/index.ts`

---

### 5.2 Create Approval Request System (Priority: Medium)

**Current Gap**: No formal mechanism for agents to request human approval.

**Actions**:

1. **Create New Skill**: `workflow/request-approval`
   - Inputs: session_id, approval_type (merge|deploy|modify-config), description, artifacts
   - Outputs: Approval request record
   - States: pending, approved, rejected, expired

2. **Create New Skill**: `workflow/respond-to-approval`
   - Inputs: approval_id, response (approve|reject), reason (optional)
   - Outputs: Updated approval record
   - Emits: U.Work record for approval response

**Deliverables**:
- `design/skills/workflow/request-approval/skill.json`
- `design/skills/workflow/respond-to-approval/skill.json`

---

### 5.3 Create Feedback Loop (Priority: Low)

**Current Gap**: No formal mechanism to capture and track human feedback on agent output.

**Actions**:

1. **Create New Skill**: `telemetry/record-feedback`
   - Inputs: session_id, feedback_type (quality|accuracy|completeness), rating (1-5), comments
   - Outputs: Feedback record
   - Used for: Improving agent instructions, identifying common issues

2. **Create New Skill**: `telemetry/analyze-feedback`
   - Inputs: context, time_range
   - Outputs: Feedback analysis report

**Deliverables**:
- `design/skills/telemetry/record-feedback/skill.json`
- `design/skills/telemetry/analyze-feedback/skill.json`

---

## Part 6: Integration and Tooling

### 6.1 Unify .codex Skills with SkillSpec (Priority: High)

**Current Gap**: `.codex/skills/` are manually maintained separately from `design/skills/`.

**Actions**:

1. **Create New Skill**: `tools/sync-codex-skills`
   - Inputs: skill_id (optional, syncs all if omitted)
   - Outputs: Updated `.codex/skills/<skill>/SKILL.md` files
   - Generates: SKILL.md from SkillSpec + SKILL.md template

2. **Add to `bun run check`**: Verify .codex skills are in sync with SkillSpec

3. **Update CONTRIBUTING.md**: Document the sync process

**Deliverables**:
- `design/skills/tools/sync-codex-skills/skill.json`
- `develop/skills/src/tools/sync-codex-skills/index.ts`
- Updated `bun run check` script

---

### 6.2 Create CLI Commands for Agent Workflow (Priority: Medium)

**Current Gap**: No CLI commands for agent session management.

**Actions**:

1. **Add CLI commands to `fpf`**:
   - `fpf session start --agent-type <type> --context <ctx> --objective <obj>`
   - `fpf session handoff --to <agent-type> --instructions <file>`
   - `fpf session complete --status <status>`
   - `fpf session audit --verdict <verdict>`

2. **Update AGENTS.md**: Document CLI commands for agent workflow

**Deliverables**:
- Updated `packages/fpf/src/commands/session.ts`
- Updated `packages/fpf/bin/fpf`
- Updated `AGENTS.md`

---

### 6.3 Create GitHub Actions Integration (Priority: Low)

**Current Gap**: No GitHub Actions for automated agent workflow.

**Actions**:

1. **Create workflow**: `.github/workflows/agent-session.yml`
   - Triggered by: PR comments with specific commands
   - Actions: Start session, run DoD checks, post results

2. **Create workflow**: `.github/workflows/proxy-audit.yml`
   - Triggered by: PR ready for review
   - Actions: Run proxy audit checks, post audit report

**Deliverables**:
- `.github/workflows/agent-session.yml`
- `.github/workflows/proxy-audit.yml`

---

## Part 7: Controlled Evolution (CSE-Inspired)

This section is inspired by the "Controlled Self-Evolution for Algorithmic Code Optimization" paper (arxiv 2601.07348), which addresses inefficiencies in iterative "generate-verify-refine" cycles - directly applicable to the Strategist-Executor-Audit loop.

### 7.1 Diversified Planning Initialization (Priority: High)

**Current Gap**: The Strategist generates a single plan, which may trap the workflow in suboptimal solution regions (initialization bias).

**Insight from CSE**: Generate structurally distinct algorithmic strategies for broad solution space coverage.

**Actions**:

1. **Create New Skill**: `planning/generate-diverse-strategies`
   - Inputs: objective, context, num_strategies (default: 3-5), diversity_axes
   - Outputs: Multiple structurally distinct approaches as an NQD-front (Novelty-Quality-Diversity)
   - Aligns with: FPF's NQD-front concept from F.18 and C.18 (NQD-CAL)
   - Each strategy includes: approach_type, key_steps, expected_artifacts, risk_assessment

2. **Define Diversity Axes** for strategy generation:
   - **Architectural**: Different structural approaches (e.g., monolithic vs modular)
   - **Temporal**: Different sequencing (e.g., test-first vs implementation-first)
   - **Risk**: Conservative vs aggressive approaches
   - **Scope**: Minimal vs comprehensive solutions

3. **Integrate with Strategist workflow**: Before handoff, generate diverse strategies and select based on context constraints

**SkillSpec Outline**:
```json
{
  "id": "planning/generate-diverse-strategies",
  "name": "Generate Diverse Strategies",
  "summary": "Generates structurally distinct approaches for broad solution space coverage (CSE-inspired).",
  "intent": {
    "goal": "Avoid initialization bias by exploring multiple solution regions before committing.",
    "non_goals": ["Execute strategies", "Rank strategies definitively"]
  },
  "inputs": [
    {"name": "objective", "type": "string", "description": "Task objective", "required": true},
    {"name": "context", "type": "string", "description": "Bounded context", "required": true},
    {"name": "num_strategies", "type": "integer", "description": "Number of strategies to generate (3-5)", "required": false},
    {"name": "diversity_axes", "type": "array", "description": "Axes for diversity: architectural|temporal|risk|scope", "required": false}
  ],
  "outputs": [
    {"name": "strategies_path", "type": "string", "description": "Path to NQD-front of strategies"}
  ],
  "procedure": [
    {"step_id": "analyze-objective", "instruction": "Parse objective and identify key constraints"},
    {"step_id": "generate-candidates", "instruction": "Generate candidate strategies along each diversity axis"},
    {"step_id": "compute-nqd-front", "instruction": "Compute non-dominated front over Quality, Novelty, Diversity"},
    {"step_id": "document-strategies", "instruction": "Write strategies with rationale for each approach"}
  ]
}
```

**Deliverables**:
- `design/skills/planning/generate-diverse-strategies/skill.json`
- `develop/skills/src/planning/generate-diverse-strategies/index.ts`

---

### 7.2 Feedback-Guided Iteration (Priority: High)

**Current Gap**: Current proxy-audit provides verdict (approved|rework|rejected) but lacks structured feedback to guide the next iteration.

**Insight from CSE**: Replace stochastic operations with feedback-guided mechanisms, enabling targeted mutation and compositional crossover.

**Actions**:

1. **Enhance `audit/proxy-audit-session`** with structured feedback:
   - Add outputs: `specific_issues[]`, `suggested_mutations[]`, `priority_order`, `preserved_elements[]`
   - Each issue includes: location, severity, suggested_fix
   - Each mutation includes: target, operation (modify|replace|extend), guidance

2. **Create New Skill**: `workflow/capture-iteration-feedback`
   - Inputs: session_id, iteration_number, what_worked, what_failed, suggested_direction
   - Outputs: Feedback record that guides next iteration
   - Links to: Previous iteration's work records

3. **Create New Skill**: `workflow/apply-iteration-feedback`
   - Inputs: session_id, feedback_path, strategy_path
   - Outputs: Updated strategy with targeted modifications
   - Implements: Targeted mutation (fix specific issues) and compositional crossover (combine working elements)

**Enhanced Proxy-Audit Schema**:
```yaml
type: U.ProxyAudit
session_id: "session-001"
verdict: "rework"
iteration: 2
feedback:
  specific_issues:
    - location: "src/validator.ts:45"
      severity: "high"
      description: "Missing null check"
      suggested_fix: "Add guard clause before processing"
  suggested_mutations:
    - target: "validation-logic"
      operation: "extend"
      guidance: "Add edge case handling for empty strings"
  preserved_elements:
    - "test-structure"
    - "api-interface"
  priority_order: ["null-check", "edge-cases", "documentation"]
```

**Deliverables**:
- Enhanced `design/skills/audit/proxy-audit-session/skill.json`
- `design/skills/workflow/capture-iteration-feedback/skill.json`
- `design/skills/workflow/apply-iteration-feedback/skill.json`

---

### 7.3 Hierarchical Evolution Memory (Priority: Medium)

**Current Gap**: No mechanism to learn from past sessions and apply patterns to new tasks.

**Insight from CSE**: Hierarchical Evolution Memory captures experience across tasks for better initialization and guidance.

**Actions**:

1. **Create New Skill**: `telemetry/extract-session-patterns`
   - Inputs: context, time_range, pattern_type (success|failure|escalation|rework)
   - Outputs: Extracted patterns with:
     - Pattern signature (objective type, context, constraints)
     - Successful approaches (what worked)
     - Anti-patterns (what failed)
     - Key decisions that led to success/failure

2. **Create New Skill**: `planning/apply-historical-patterns`
   - Inputs: objective, context, pattern_refs (optional)
   - Outputs: Strategy informed by historical patterns
   - Implements: Pattern matching to find similar past tasks, then applies learned approaches

3. **Create New Skill**: `telemetry/build-evolution-memory`
   - Inputs: context, aggregation_level (session|week|month)
   - Outputs: Hierarchical memory structure with:
     - Task-level patterns (specific solutions)
     - Context-level patterns (domain-specific approaches)
     - Cross-context patterns (universal strategies)

**Pattern Schema**:
```yaml
type: U.EvolutionPattern
pattern_id: "pattern-001"
signature:
  objective_type: "add-validation"
  context: "TypeScript"
  constraints: ["must-pass-tests", "backward-compatible"]
successful_approaches:
  - approach: "test-first"
    success_rate: 0.85
    avg_iterations: 1.5
  - approach: "implementation-first"
    success_rate: 0.60
    avg_iterations: 2.8
anti_patterns:
  - pattern: "modify-multiple-files-simultaneously"
    failure_rate: 0.70
    common_issue: "merge-conflicts"
key_decisions:
  - decision: "isolate-changes"
    impact: "positive"
    rationale: "Reduces blast radius of failures"
```

**Deliverables**:
- `design/skills/telemetry/extract-session-patterns/skill.json`
- `design/skills/planning/apply-historical-patterns/skill.json`
- `design/skills/telemetry/build-evolution-memory/skill.json`
- `design/specs/evolution-memory/evolution-memory-spec.md`

---

### 7.4 Controlled vs Uncontrolled Evolution (Priority: Medium)

**Current Gap**: Agent iterations may be uncontrolled, leading to random exploration rather than directed improvement.

**Insight from CSE**: Control mechanisms ensure evolution is directed toward better solutions, not random drift.

**Actions**:

1. **Enhance RoC with Evolution Controls**:
   - Add `evolution_policy` to RoC schema:
     ```yaml
     evolution_policy:
       max_iterations: 3
       iteration_budget_decay: 0.8  # Each iteration gets 80% of previous budget
       mutation_scope: "targeted"   # targeted|broad|minimal
       crossover_allowed: true      # Can combine elements from different attempts
       rollback_threshold: 2        # Rollback after N failed iterations
     ```

2. **Create New Skill**: `governance/check-evolution-bounds`
   - Inputs: session_id, iteration_number, roc_path
   - Outputs: Evolution status (continue|escalate|rollback)
   - Checks: Iteration count, budget remaining, improvement trajectory

3. **Create New Skill**: `workflow/rollback-to-checkpoint`
   - Inputs: session_id, checkpoint_iteration
   - Outputs: Restored state from checkpoint
   - Used when: Evolution is not converging, need to try different approach

**Deliverables**:
- Enhanced `design/specs/roc/rule-of-constraints-spec.md` with evolution policy
- `design/skills/governance/check-evolution-bounds/skill.json`
- `design/skills/workflow/rollback-to-checkpoint/skill.json`

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
1. Mint Name Cards for agent roles (1.1)
2. Create `governance/start-agent-session` skill (1.2)
3. Create `governance/handoff-to-agent` skill (1.2)
4. Create `governance/complete-agent-session` skill (1.2)
5. Enhance `telemetry/log-work` with agent metadata (1.3)

### Phase 2: Workflow (Weeks 3-4)
1. Define Handoff Artifact Schema (2.1)
2. Create `workflow/generate-handoff` skill (2.1)
3. Create `audit/verify-definition-of-done` skill (2.2)
4. Create `audit/proxy-audit-session` skill (1.2)

### Phase 3: Governance (Weeks 5-6)
1. Define RoC Schema (3.1)
2. Create `governance/define-roc` skill (3.1)
3. Create `governance/check-roc-compliance` skill (3.1)
4. Create `workflow/escalate-to-human` skill (3.3)

### Phase 4: Telemetry (Weeks 7-8)
1. Create `telemetry/aggregate-agent-work` skill (4.1)
2. Create `publication/summarize-agent-session` skill (5.1)
3. Create `workflow/request-approval` skill (5.2)

### Phase 5: Integration (Weeks 9-10)
1. Create `tools/sync-codex-skills` skill (6.1)
2. Add CLI commands for agent workflow (6.2)
3. Update documentation (AGENTS.md, README.md)

### Phase 6: Controlled Evolution (Weeks 11-12)
1. Create `planning/generate-diverse-strategies` skill (7.1)
2. Enhance `audit/proxy-audit-session` with structured feedback (7.2)
3. Create `workflow/capture-iteration-feedback` skill (7.2)
4. Create `workflow/apply-iteration-feedback` skill (7.2)
5. Create `telemetry/extract-session-patterns` skill (7.3)
6. Create `planning/apply-historical-patterns` skill (7.3)
7. Create `governance/check-evolution-bounds` skill (7.4)
8. Create `workflow/rollback-to-checkpoint` skill (7.4)

---

## Success Criteria

1. **Auditability**: Every agent action produces a U.Work record with full traceability
2. **Accountability**: Every agent session has a formal RoleAssignment
3. **Reproducibility**: Handoff artifacts are structured and parseable
4. **Compliance**: DoD verification is automated and enforced
5. **Observability**: Agent work can be aggregated and analyzed
6. **Scalability**: New agent types can be added without structural changes

---

## Appendix: Skill Inventory Update

After implementing this plan, the SKILL_INVENTORY.md should include:

| Skill ID | Family | PatternRefs | Status | Description |
|:---|:---|:---|:---|:---|
| `governance/start-agent-session` | Governance | A.2.1; A.15.1 | experimental | Initializes a formal agent session with RoleAssignment |
| `governance/handoff-to-agent` | Governance | A.15.1; E.13 | experimental | Creates structured handoff between agents |
| `governance/complete-agent-session` | Governance | A.15.1 | experimental | Completes an agent session with status |
| `governance/define-roc` | Governance | A.15; E.13 | experimental | Defines Rule-of-Constraints for agents |
| `governance/check-roc-compliance` | Governance | A.15; E.13 | experimental | Checks agent work against RoC |
| `governance/declare-agent-capability` | Governance | A.2; A.13 | experimental | Declares agent capabilities and limitations |
| `audit/proxy-audit-session` | Audit | E.13 | experimental | Performs proxy audit on agent session |
| `audit/verify-definition-of-done` | Audit | E.13; A.15 | experimental | Verifies DoD requirements are met |
| `workflow/generate-handoff` | Workflow | A.15.1 | experimental | Generates structured handoff artifact |
| `workflow/parse-handoff` | Workflow | A.15.1 | experimental | Parses handoff artifact for agent consumption |
| `workflow/escalate-to-human` | Workflow | A.15.1 | experimental | Creates escalation request |
| `workflow/resolve-escalation` | Workflow | A.15.1 | experimental | Resolves escalation request |
| `workflow/request-approval` | Workflow | A.15.1 | experimental | Requests human approval |
| `workflow/respond-to-approval` | Workflow | A.15.1 | experimental | Records approval response |
| `workflow/generate-agent-instructions` | Workflow | F.18 | experimental | Generates agent-specific instructions |
| `telemetry/aggregate-agent-work` | Telemetry | A.15.1; G.12 | experimental | Aggregates agent work across sessions |
| `telemetry/generate-agent-report` | Telemetry | A.15.1; G.12 | experimental | Generates human-readable agent report |
| `telemetry/generate-agent-dhc` | Telemetry | G.12 | planned | Generates Discipline Health Dashboard for agents |
| `telemetry/record-feedback` | Telemetry | A.15.1 | planned | Records human feedback on agent output |
| `telemetry/analyze-feedback` | Telemetry | G.12 | planned | Analyzes feedback patterns |
| `publication/summarize-agent-session` | Publication | E.17 | experimental | Generates human-readable session summary |
| `tools/sync-codex-skills` | Tools | F.18 | experimental | Syncs .codex skills with SkillSpec |
| `planning/generate-diverse-strategies` | Planning | F.18; C.18 | experimental | Generates NQD-front of structurally distinct strategies (CSE-inspired) |
| `workflow/capture-iteration-feedback` | Workflow | A.15.1; E.13 | experimental | Captures structured feedback to guide next iteration |
| `workflow/apply-iteration-feedback` | Workflow | A.15.1 | experimental | Applies feedback for targeted mutation and crossover |
| `workflow/rollback-to-checkpoint` | Workflow | A.15.1 | experimental | Rolls back to previous checkpoint when evolution stalls |
| `telemetry/extract-session-patterns` | Telemetry | A.15.1; G.12 | experimental | Extracts success/failure patterns from historical sessions |
| `telemetry/build-evolution-memory` | Telemetry | A.15.1; G.12 | planned | Builds hierarchical memory structure across sessions |
| `planning/apply-historical-patterns` | Planning | A.15.1; F.18 | experimental | Applies learned patterns to new task planning |
| `governance/check-evolution-bounds` | Governance | A.15; E.13 | experimental | Checks iteration bounds and evolution policy compliance |

---

## References

- FPF-Spec (v9): Core patterns A.2, A.12, A.13, A.15, E.13, F.4, F.18, G.12, C.18
- AGENTS.md: Two-Agent Loop (Strategist/Executor pattern)
- DRR-003: Audit-Grade Skill Run Trace Contract
- DRR-002: Spec-to-Skills Bridge Strategy
- Hu et al. (2026): "Controlled Self-Evolution for Algorithmic Code Optimization" (arxiv:2601.07348) - Inspiration for Part 7: Controlled Evolution
