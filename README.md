Here’s a complete `README.md` you can paste to replace the whole file.
FPF note: none.

````md
# Agent Skills (Claude Code + OpenAI Codex)

This repo contains filesystem-based Agent Skills: small folders with a `SKILL.md` (YAML front matter + Markdown instructions), plus optional scripts/resources. The goal is that each Skill works in both Claude Code and OpenAI Codex.

## Quick start

### Option A: Use in a repo (team-friendly)

1) Put Skills in both repo locations:
- Claude Code: `.claude/skills/<skill>/SKILL.md`
- Codex: `.codex/skills/<skill>/SKILL.md`

2) Claude Code: open the repo and ask:
- `What Skills are available?`
Claude auto-loads Skills when files change.

3) Codex: start Codex in the repo root, then:
- enable Skills if needed: `codex --enable skills`
- restart Codex after adding Skills
- list Skills: `/skills`

### Option B: Install for one user (personal Skills)

Claude Code (personal):
```bash
mkdir -p ~/.claude/skills
cp -R .claude/skills/<skill> ~/.claude/skills/
````

Codex (personal; macOS/Linux default):

```bash
mkdir -p ~/.codex/skills
cp -R .codex/skills/<skill> ~/.codex/skills/
```

Restart Codex after copying.

## How Skills work (conceptual model)

Discovery: only `name` + `description` are loaded at startup.
Activation: a Skill triggers when your request matches its description (implicit). Codex also supports explicit invocation.
Execution: the agent reads `SKILL.md` and any referenced files; it may run bundled scripts when instructed.

## Skill structure

Recommended layout (both tools):

```
<skill>/
  SKILL.md
  scripts/        (optional; executable helpers)
  references/     (optional; docs)
  assets/         (optional; templates/resources)
```

## SKILL.md format

`SKILL.md` starts with YAML front matter between `---` markers, then Markdown instructions.

Minimal cross-tool template:

```md
---
name: my-skill
description: One line. Include trigger keywords a user would naturally say. Use when <conditions>.
---

# Goal
State what the Skill accomplishes.

# Inputs
List what the user may provide (files, diffs, URLs, text).

# Output
State the required output format.

# Procedure
Step-by-step instructions.

# Edge cases
What to do when inputs are missing/ambiguous.
```

Cross-tool compatibility rules (safe defaults):

* `name`: lowercase letters, numbers, hyphens only; keep length ≤64 chars; match the directory name.
* `description`: single line; keep length ≤500 chars; include “Use when …” + natural keywords.
* Keep `SKILL.md` short; move long reference material into separate files (progressive disclosure).

Metadata notes:

* Claude supports additional YAML fields like `allowed-tools`, `model`, `context`, `hooks`, `user-invocable`, etc.
* Codex ignores extra YAML keys, so Claude-specific fields are usually safe to include.
* Codex optionally supports `metadata.short-description`.

## Where Skills live

### Claude Code

Paths:

* Personal: `~/.claude/skills/<skill>/`
* Project: `.claude/skills/<skill>/`
* Enterprise / managed (org-controlled)
* Plugin-bundled (via plugins)

Precedence: managed > personal > project > plugin.

### OpenAI Codex

Repo scopes (highest precedence wins; Codex searches these when launched inside a repo):

* `$CWD/.codex/skills`
* `$CWD/../.codex/skills`
* `$REPO_ROOT/.codex/skills`

User scope:

* `$CODEX_HOME/skills` (macOS/Linux default: `~/.codex/skills`)

Admin scope:

* `/etc/codex/skills`

System scope:

* bundled with Codex.

## Using a Skill

### Claude Code

* Trigger implicitly: ask for something matching the Skill description.
* Verify loaded: `What Skills are available?`
* If it doesn’t trigger: rephrase using keywords from the description.

### Codex

* List Skills: `/skills`
* Explicit invoke: type `$` and select a Skill, or type `$skill-name` in your prompt.
* Implicit invoke: describe the task; Codex may choose a matching Skill.

If Skills don’t appear in Codex:

* enable Skills: `codex --enable skills`
* restart Codex
* confirm the folder is not symlinked (Codex ignores symlinked Skill directories)
* confirm `SKILL.md` YAML is valid and `name`/`description` fit length rules

## Creating a new Skill

Fastest (Codex):

1. Run in Codex:

   * `$skill-creator`
2. Follow prompts (what it does, when it triggers, instruction-only vs script-backed).
3. Copy the created Skill folder into `.claude/skills/` if you want Claude Code support too.

Manual (works everywhere):

```bash
SKILL=my-skill
mkdir -p .codex/skills/$SKILL .claude/skills/$SKILL
$EDITOR .codex/skills/$SKILL/SKILL.md
cp .codex/skills/$SKILL/SKILL.md .claude/skills/$SKILL/SKILL.md
```

Do not symlink `.codex/skills/<skill>`: Codex ignores symlinked Skill directories.

## Troubleshooting

Codex:

* Skill doesn’t appear: enable Skills + restart; confirm `SKILL.md` exists; no symlink; YAML valid; `name`/`description` within limits.
* Skill doesn’t trigger: rewrite `description` to be concrete and keyword-rich; avoid overlapping Skills with similar descriptions.

Claude Code:

* Skill doesn’t appear: confirm location, YAML validity, and `name` rules; Claude reloads on save.
* Conflicts: same `name` resolves by precedence; rename to avoid collisions.

## References (primary docs; accessed 2026-01-14)

OpenAI Codex:

* [https://developers.openai.com/codex/skills/](https://developers.openai.com/codex/skills/)
* [https://developers.openai.com/codex/skills/create-skill/](https://developers.openai.com/codex/skills/create-skill/)
* [https://developers.openai.com/codex/cli/](https://developers.openai.com/codex/cli/)
* [https://developers.openai.com/codex/cli/reference/](https://developers.openai.com/codex/cli/reference/)
* Agent Skills standard: [https://agentskills.io](https://agentskills.io)

Anthropic / Claude:

* [https://code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
* [https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
