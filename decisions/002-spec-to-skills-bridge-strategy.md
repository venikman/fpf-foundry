# 002. FPF Spec-to-Skills Bridge Strategy

## Status

**Proposed** on 2026-01-11

## Context
>
> [!NOTE]
> This document serves as the **Design-Rationale Record (DRR)** (ref: E.9) for the initiative to "Bridge" the FPF Specification (Patterns) into the FPF Skill Stack (Capabilities).

## 1. Context & Problem Statement

The **FPF Specification** (Part A-G) defines the *Laws* and *Patterns* of the framework.
The **FPF Skill Stack** provides the *Runtime* and *Capabilities* to execute these patterns.
Currently, there is a gap: we have the Outline (`FPF_Spec_8_Outline.md`) but no executable Skills implementing these patterns.

**Goal**: Systematically transform normative FPF Patterns into executable `SKILL.md` definitions.

## 2. Methodology: Spec-to-Skills Execution

We will follow the **Standard 3.0 Spec-to-Skills Methodology** (from `design/standards_and_methodology.md`):

1. **Source**: `FPF_Spec_8_Outline.md` (The Constitution).
2. **Extraction**: Identify "Actionable" Patterns (e.g., *Method*, *Audit*, *Generate*, *Check*) vs. "Definitional" Patterns (e.g., *Ontology*, *Taxonomy*).
3. **Inventory**: Registry in `SKILL_INVENTORY.md`.
4. **Implementation**: Mint `SKILL.md` manifests.

## 3. Structural Decisions

### 3.1 The Inventory Baseline

We need to initialize the central registry.

* **File**: `SKILL_INVENTORY.md`
* **Location**: Root of `fpf-foundry` (or `contexts/Skills/design/` per strict spec, but we will start at root for visibility if needed). *Correction: We should adhere to the standard `contexts/Skills/design/SKILL_INVENTORY.md` and create the directory if missing.*

### 3.2 Candidate Selection Strategy

Not every Pattern becomes a Skill. The FPF Spec contains Definitions (Nouns) and Methods (Verbs). Since a **Skill** is formally a `U.MethodDescription` (Recipe), we only bridge "Verb-Patterns".

### 3.3 Selection Rules (The "Verb Test")

We apply the following filter to every Pattern in the outline:

| Pattern Category | Nature | Decision | Example |
| :--- | :--- | :--- | :--- |
| **Method / Process** | **Action (Verb)** | **✅ CREATE SKILL** | **F.18 Naming Protocol** ("How to Mint") → `design/mint-name`<br>**A.15.1 Work Record** ("How to Log") → `telemetry/log-work` |
| **Ontology / Type** | **Structure (Noun)** | ❌ **NO SKILL** | **A.1 Holon** (Concept only).<br>**A.2 Role** (Definition only).<br>*(Skills will USE these types, but are not distinct skills themselves)* |
| **Metric / Scale** | **Measurement** | **✅ CREATE SKILL** | **A.18 CSLC** ("How to Measure") → `metric/evaluate-cslc` |
| **Constraint / Law** | **Rule** | 🔶 **CREATE POLICY** | **E.5.1 Lexical Firewall** → Implemented as a **Linter** or **Guard** inside other skills. |

**The Golden Rule**: *Can an Agent "execute" this pattern to produce a `U.Work` record?*

* Yes → It's a Skill.
* No → It's a Type, Standard, or Principle.

### 3.4 Policy Realization Strategy

Patterns that represent **Laws** (e.g., `E.5.1 Lexical Firewall`, `A.7 Strict Distinction`) cannot be "executed" directly, but they must be **enforced**. We handle them in two ways:

#### A. Passive Constraints (RoC - Rule of Constraints)

* **Mechanism**: Embedded in the `SKILL.md` YAML Frontmatter (under `allowed_tools` or `policies`) or via **Prerequisite Injection**.
* **Example**: `E.5.3 Unidirectional Dependency` is enforced by NOT giving a "Core" skill access to "Tooling" directories.
* **Example (New)**: `F.18 Naming` context dependence is enforced by injecting `F.1-F.17` prerequisites directly into the `SKILL.md` description, ensuring the Agent accesses local meaning (F.0.1) before minting.

#### B. Active Auditors (Validation Skills)

* **Mechanism**: A dedicated Skill that *checks* compliance.
* **Example**: `E.5.1 Lexical Firewall` → `design/audit-lexicon` (a skill that scans text and flags banned jargon).
* **Pattern**: These become **"Verify"** or **"Audit"** skills in the inventory.

## 4. Execution Plan

### Step 1: Initialize Infrastructure

* Create local directory `contexts/Skills/design`.

* Create `contexts/Skills/design/SKILL_INVENTORY.md` with Table header.

### Step 2: Extraction Run

* Parse `FPF_Spec_8_Outline.md`.

* Select top 5-10 high-impact patterns.
* Add to Inventory as "Planned".

### Step 3: Scaffold High-Priority Skills

* Create `contexts/Skills/src/<domain>/<name>/SKILL.md` for the top picks.
