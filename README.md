# FPF Foundry ([`fpf-foundry`](runtime/contexts/Tooling/design/names/fpf-foundry.md))

> **The creative workshop for minting names, forging skills, and refining the FPF constitution.**

## Identity

This workspace is the **FPF Foundry**. It serves as the "Holonic Prime" for:

1. **The Law**: The First Principles Framework Specification (`design/specs/FPF-Spec.md`).
2. **The Capabilities**: The FPF Skill Stack (`design/skills` + `develop/skills/src`).
3. **The Tooling**: The forge tools (e.g., `mint-name`) used to build the system.

## Structure

* `design/` - Design-time sources (specs, docs, decisions, prompts, examples, skill definitions).
* `develop/` - Development-time tools, scripts, and skill implementations.
* `runtime/` - Generated outputs (contexts, compile output, skill index).
* `.codex/` - Codex CLI skill definitions (`SKILL.md`) used by the agent runtime.

## SkillSpec (soft launch)

SkillSpec is authored under `design/skills/**/skill.json` (and `design/examples/skills/**/skill.json` for fixtures) and must pass validation:

```sh
bun develop/tools/skill/validate.ts path/to/skill.json
```

The schema and normative spec live in `design/specs/skill/`.

## Quick Start

* **Mint a Name**: `bun develop/skills/src/design/mint-name/index.ts`
* **View Inventory**: `design/skills/SKILL_INVENTORY.md`
* **View Backlog**: `design/skills/SKILL_BACKLOG.md`

Inventory is generated from SkillSpec files:

```sh
bun develop/tools/skill/inventory.ts
```
