FPF note: none.

# FPF Foundry (Bun-first `fpf` CLI + Agent Skills)

This repo contains:
- A Bun-first CLI (`fpf`) published to npm for `bunx` usage.
- Filesystem-based Agent Skills under `.codex/skills/` (Codex CLI compatible).

## 5-minute quickstart (fresh empty dir → deterministic diff)

Prereq: Bun installed.

```bash
mkdir fpf-demo && cd fpf-demo
git init -q

bunx --bun @venikman/fpf init
bunx --bun @venikman/fpf check

git add -A
git diff --cached
```

Machine mode examples:

```bash
bunx --bun @venikman/fpf init --json | cat
bunx --bun @venikman/fpf check --json | cat
```

## Repo dev

```bash
bun install
bun run check
bun test
```

Run the local (workspace) CLI without publishing:

```bash
bun packages/fpf/bin/fpf --help
```

