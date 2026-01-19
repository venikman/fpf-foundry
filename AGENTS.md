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
- `fpf session start|handoff|complete|audit`
  - Session records: `runtime/contexts/<context>/sessions/<session_id>.session.md`
  - Handoff records: `runtime/contexts/<context>/handoffs/<session_id>.<to_agent_type>.<n>.handoff.yaml`
  - Audit reports: `runtime/contexts/<context>/audits/dod/<session_id>.<timestamp>.dod.md` and `runtime/contexts/<context>/audits/proxy/<session_id>.<timestamp>.proxy-audit.md`
  - Requires skill implementations under `develop/skills/src` in the target root.

## Repo Dev Commands

- Install deps: `bun install`
- Repo checks: `bun run check`
- Run tests: `bun test`
- Run local CLI: `bun packages/fpf/bin/fpf --help`
