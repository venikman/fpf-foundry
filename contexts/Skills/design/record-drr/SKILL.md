---
name: design/record-drr
description: Records a formal Design-Rationale Record (DRR) for architectural decisions.
version: 0.1.0
status: experimental
family: design
role: Archivist
allowed_tools:
  - list_dir
  - view_file
  - write_to_file
policies:
  - E.9 Design-Rationale Record
  - A.10 Evidence Graph Referring
---

# Design: Record DRR (E.9)

## 1. Context

This skill implements **Pattern E.9 (Design-Rationale Record Method)**. It captures the "Why" behind architectural changes, providing immutable history and evolutionary context.

## 2. Metadata

- **ID**: `design/record-drr`
- **Role**: `U.RoleAssignment(Archivist)`
- **Standard**: E.9, A.10

## 3. Instructions

### 3.1 Input Requirements

1. **Context**: The affected system or domain.
2. **Title**: Short summary of the decision.
3. **Status**: `Proposed`, `Accepted`, `Deprecated`, `Rejected`.
4. **Context (Problem)**: What is the issue?
5. **Decision**: What are we doing?
6. **Consequences**: What becomes easier? What becomes harder? (Trade-offs).

### 3.2 Output Artifact

Generate a Markdown file (The DRR) following the ADR (Architecture Decision Record) format:

- **Filename**: `[NNN]-[kebab-title].md` (where NNN is a sequential number).
- **Structure**:

    ```markdown
    # [NNN] [Title]

    ## Status
    [Status] on [Date]

    ## Context
    [Description of the problem/force]

    ## Decision
    [Description of the solution]

    ## Consequences
    [Positive and Negative effects]
    ```

### 3.4 Execution Steps

1. **Index**: Find the next sequential number in the `decisions/` directory.
2. **Draft**: Create the file with the strict headers.
3. **Commit**: (Implicit) The file is written to disk.
