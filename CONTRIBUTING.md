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

## Release process

- Bump `packages/fpf/package.json` version.
- Tag and push: `vX.Y.Z` (must match the package version).
- Ensure GitHub secret `NPM_CONFIG_TOKEN` is configured for npm publishing.

