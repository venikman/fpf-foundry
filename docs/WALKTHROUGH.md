# FPF Spec-to-Skill: The Strategy

**Goal:** Demonstrate the methodology for transforming the First Principles Framework "Laws" into executable "Capabilities" for AI Agents.

## 1. The Core Strategy: "The Bridge"

We do not write skills; we **bridge** them from the Specification.
Our strategy is a rigorous 3-step pipeline designed to ensure that every Agent capability is legally grounded in an FPF Pattern.

### Step 1: Selection (The "Verb Test")

We have the **Full FPF Spec (8) Outline** (1,000+ lines of patterns).
We will proceed systematically through the entire list—from `A.0` to `F.18`—applying the **Verb Test**: "Does this pattern describe an *action* an Agent can perform?"

| Pattern | Verb Test | Result |
| :--- | :--- | :--- |
| `A.1 Holon` | **NO** (Definition) | Used as a Type Definition. |
| `A.15.1 Work` | **YES** (Record) | Becomes `telemetry/log-work`. |
| `F.18 Naming` | **YES** (Mint) | Becomes `design/mint-name`. |

### Step 2: Automated Extraction (The "Spec-First" Guarantee)

We never manually draft the semantic rules of a skill. We **extract** them programmatically.

* **Tool**: `fpf-generate-pattern` (Custom tooling)
* **Process**:
    1. Parse `FPF-Spec (8).md`.
    2. Locate the Pattern ID.
    3. Extract the normative text (The "Rules").
    4. Generate `SKILL.md` with strict metadata.
* **Result**: The Agent's instructions are identical to the Human's "Law Book".

### Step 3: Minimal Execution Logic (The "Kernel")

We write the smallest possible amount of code to make the text executable.

* **Philosophy**: The `SKILL.md` (The Law) is primary; the `index.ts` (The Code) is just a servant.
* **Implementation**: We use `Bun/TypeScript` for zero-build, local-first execution.
* **Composition**: Skills trigger *other* skills (e.g., Naming calls Logging) to enforce compliance automatically.

## 2. Proof of Concept: "Naming & Logging"

To prove this strategy works, we successfully bridged two complex patterns:

| Spec Pattern (Law) | Agent Skill (Capability) | Status |
| :--- | :--- | :--- |
| **F.18 Naming Protocol** | `design/mint-name` | ✅ **Active** (Mints cards, enforces NQD spec) |
| **A.15.1 U.Work** | `telemetry/log-work` | ✅ **Active** (Creates audit trails) |

**The Result:**
When an Agent is asked to "Mint a Name", it doesn't just write a file. It:

1. Reads the F.18 Law (from `SKILL.md`).
2. Executes the logic.
3. **Self-Audits** by calling A.15.1 to log the work.

## 3. Why This Strategy Matters

> "**We don't train Agents to 'behave'. We give them the Laws as executable tools.**"

By generating skills directly from the Spec, we ensure:

1. **Drift Proofing**: If the Spec changes, we re-generate the Skill.
2. **Auditability**: Every Agent action traces back to a specific paragraph in the FPF Spec.
3. **Completeness**: We have the full Outline to guide us. We won't miss anything.
