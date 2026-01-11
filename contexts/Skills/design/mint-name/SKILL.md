---
name: design/mint-name
description: Mints a new F.18 Name Card with strict Twin-Label and Sense-Seed validation.
version: 0.1.0
status: experimental
family: design
role: Naming Architect
allowed_tools:
  - list_dir
  - view_file
  - write_to_file
policies:
  - E.5.1 DevOps Lexical Firewall (No jargon in Core)
  - F.18 Local-First Naming
---

# Design: Mint Name (F.18)

## 1. Context

This skill implements **Pattern F.18 (Local-First Unification Naming Protocol)**. It is used to create authoritative **Name Cards** for new concepts within a specific `U.BoundedContext`.

## 2. Metadata

- **ID**: `design/mint-name`
- **Role**: `U.RoleAssignment(NamingArchitect)`
- **Standard**: F.18, E.10 (LEX-BUNDLE)

## 3. Instructions

### 3.1 Input Requirements

To mint a name, you must identify:

1. **Bounded Context**: Where does this term live? (e.g., `Kernel`, `Runtime`).
2. **Concept Definition (MDS)**: A single sentence: *A [Kind] that [Functions].*
3. **Candidate Twins**: The proposed `Technical-ID` (kebab-case) and `Plain-Label` (Title Case).

### 3.2 Evaluation Matrix (Sense-Seeds)

Evaluate the candidate against the **7 Sense-Seeds** (S1-S7) from F.18:

- `S1 Add`: "Add a new `[Label]`..."
- `S2 Retrieve`: "Get a `[Label]` from..."
- ... (Check for linguistic flow)

**Constraint**: If the name creates confusion with an existing FPF Core term, reject it (WP - Wrong Prototype).

### 3.3 Output Artifact

Generate a Markdown file (The Name Card) containing:

- **Header**: `F.18 Name Card: [Label]`
- **Twin-Labels**: `[tech-id]` / `[Plain Label]`
- **Context**: `[Context Name]`
- **MDS**: `[Definition]`
- **Rationale**: Why this name? (Cite Sense-Seeds if needed).

### 3.4 Execution Steps

1. **Search**: Check `SKILL_INVENTORY.md` or existing Name Cards to prevent collisions.
2. **Evaluate**: Run the Sense-Seed check mentally.
3. **Mint**: Write the file to `contexts/[Context]/design/names/[tech-id].md`.
