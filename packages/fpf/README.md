# `@venikman/fpf`

Bun-first FPF CLI.

## Usage

```bash
bunx --bun @venikman/fpf --help
```

Initialize a minimal workspace and verify invariants:

```bash
mkdir my-fpf && cd my-fpf
bunx --bun @venikman/fpf init
bunx --bun @venikman/fpf check
```

Machine output:

```bash
bunx --bun @venikman/fpf init --json
bunx --bun @venikman/fpf check --json
```

