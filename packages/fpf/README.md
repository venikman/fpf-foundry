# `@venikman/fpf`

Bun-first FPF CLI.

## Usage

Primary (npm):

```bash
bunx --bun @venikman/fpf --help
```

Local fallback (no npm):

```bash
FPF_REPO=/path/to/fpf-foundry
"$FPF_REPO"/packages/fpf/bin/fpf --help
```

Quickstart (one command -> artifact):

```bash
mkdir my-fpf && cd my-fpf
bunx --bun @venikman/fpf quickstart
```

Local fallback:

```bash
FPF_REPO=/path/to/fpf-foundry
mkdir my-fpf && cd my-fpf
"$FPF_REPO"/packages/fpf/bin/fpf quickstart --root .
```

Troubleshooting:

```bash
bunx --bun @venikman/fpf doctor --root .
```

Local fallback:

```bash
FPF_REPO=/path/to/fpf-foundry
"$FPF_REPO"/packages/fpf/bin/fpf doctor --root .
```

Initialize a minimal workspace and verify invariants:

```bash
mkdir my-fpf && cd my-fpf
bunx --bun @venikman/fpf init
bunx --bun @venikman/fpf check
```

Local fallback:

```bash
FPF_REPO=/path/to/fpf-foundry
mkdir my-fpf && cd my-fpf
"$FPF_REPO"/packages/fpf/bin/fpf init --root .
"$FPF_REPO"/packages/fpf/bin/fpf check --root .
```

Machine output:

```bash
bunx --bun @venikman/fpf quickstart --json
bunx --bun @venikman/fpf init --json
bunx --bun @venikman/fpf check --json
```

Local fallback:

```bash
FPF_REPO=/path/to/fpf-foundry
"$FPF_REPO"/packages/fpf/bin/fpf quickstart --root . --json
"$FPF_REPO"/packages/fpf/bin/fpf init --root . --json
"$FPF_REPO"/packages/fpf/bin/fpf check --root . --json
```
