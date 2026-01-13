# 001. Rename System to FPF Foundry

## Status

**Proposed** on 2026-01-11

## Context

The repository 'fpf-skills' contained both the Specification and the Skills implementation, causing identity confusion. We needed a name that reflects the workspace's dual nature as a source of truth and a production environment.

## Decision

Adopt 'FPF Foundry' as the system identity, positioning it as the 'Holonic Prime' forge for minting FPF artifacts.

## Consequences

### Positive

- [x] **Clarity**: "Foundry" clearly distinguishes the *activity* (minting/forging) from the *artifacts* (Spec/Skills), solving the ambiguity of `fpf-skills`.
- [x] **Alignment**: Aligns with the "Holonic" structure (Prime/Contexts) and the industrial/craft metaphor of the framework.
- [x] **Scalability**: The name allows for future tools and processes to be added without them feeling like "Skills".

### Negative

- [x] **Repository Divergence**: The physical repository name (`fpf-skills`) now differs from the logical system name (`FPF Foundry`), requiring README clarification.
- [x] **Migration Friction**: Any existing documentation referencing the old name needs manual updates.

## Compliance

- [x] **E.9 DRR**: Follows standard format.
