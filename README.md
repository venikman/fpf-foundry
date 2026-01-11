# FPF Foundry ([`fpf-foundry`](contexts/Tooling/design/names/fpf-foundry.md))

> **The creative workshop for minting names, forging skills, and refining the FPF constitution.**

## Identity

This workspace is the **FPF Foundry**. It serves as the "Holonic Prime" for:

1. **The Law**: The First Principles Framework Specification (`FPF-Spec.md`).
2. **The Capabilities**: The FPF Skill Stack (`contexts/Skills`).
3. **The Tooling**: The forge tools (e.g., `mint-name`) used to build the system.

## Structure

* `FPF-Spec.md` - The Authoritative Specification.
* `contexts/`
  * `Skills/` - Executable agents and skills.
  * `Tooling/` - Meta-tools for the Foundry itself.
* `docs/` - Strategy and DRRs.

## Quick Start

* **Mint a Name**: `bun contexts/Skills/src/design/mint-name/index.ts`
* **View Inventory**: `contexts/Skills/design/SKILL_INVENTORY.md`
