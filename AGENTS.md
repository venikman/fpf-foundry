# FPF Foundry (Agent Instructions)

## Project Layout (Stable Paths)

- Published CLI package: `packages/fpf/`
- CLI bin (shebang): `packages/fpf/bin/fpf`
- CLI entrypoint (compile target): `packages/fpf/src/entry.ts`

## CLI Contract (Stable)

### Global flags (all commands)

- `--root <dir>`: target root directory (default: `process.cwd()`).
- `--json`: machine mode.

### Exit codes (stable)

- `0`: success
- `1`: usage / input / IO error
- `2`: invariant check failed (`fpf check`)
- `3`: unhandled/internal error

### JSON mode rules (stable)

- In `--json` mode, every command prints exactly **one JSON object** to stdout, terminated by `\n`.
- In `--json` mode, commands do not print logs/progress text.
- Paths in JSON `created/updated/skipped` arrays are repo-relative and POSIX-style (`/` separators).

### Commands (stable)

- `fpf init [--template minimal] [--force]`
  - Creates a minimal FPF workspace under `--root`.
  - JSON fields: `created`, `updated`, `skipped`.
- `fpf check [--fix]`
  - Validates SkillSpec (`design/skills/**/skill.json`), verifies `design/skills/SKILL_INVENTORY.md`, and runs inventory + unicode safety checks.
  - JSON fields: `issues[]` (empty on success).
- `fpf doctor [--check]`
  - Reports environment + root status; optional `--check` embeds `fpf check` output under `check`.
- `fpf mint-name ...`, `fpf record-drr ...`, `fpf log-work ...`
  - Domain commands; all accept `--root` and support `--json`.

## Repo Dev Commands

- Install deps: `bun install`
- Repo checks: `bun run check`
- Run tests: `bun test`
- Run local CLI: `bun packages/fpf/bin/fpf --help`

