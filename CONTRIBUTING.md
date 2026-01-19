# Contributing

## Prerequisites

- Bun (latest recommended)

## Setup

```bash
bun install
```

## Verify

```bash
bun test
bun run check
```

## Add a skill

1. Scaffold: `bun packages/fpf/bin/fpf scaffold skill --skill-id <id> --name "<Title>" --summary "<Summary>"`.
2. Implement: `develop/skills/src/<skill-id>/index.ts` + tests/fixtures.
3. Update docs: `design/skills/<skill-id>/SKILL.md` and `design/skills/<skill-id>/skill.json`.
4. Regenerate generated files: `bun run check` (updates SKILL_INVENTORY, SKILL_INDEX, and .codex skills).

## Sync Codex skills

Codex skill docs are generated from `design/skills/**/SKILL.md` into `.codex/skills/<skill-id-with-dashes>/SKILL.md`.

```bash
bun develop/tools/codex/sync-skills.ts
```

## Release process

- Bump `packages/fpf/package.json` version.
- Tag and push: `vX.Y.Z` (must match the package version).
- Ensure GitHub secret `NPM_CONFIG_TOKEN` is configured for npm publishing.
