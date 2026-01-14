---
name: design/init-context
description: Initializes a bounded context skeleton under runtime/contexts/<context>.
version: 0.1.0
status: experimental
family: design
role: Steward
allowed_tools:
  - write_to_file
policies:
  - A.15 Role–Method–Work Alignment
---

# Design: Init Context

## Execution

Run:

```bash
bun develop/skills/src/design/init-context/index.ts --context "Tooling" --description "Tools and generators."
```

This creates standard folders under `runtime/contexts/<context>/` and attempts to log a `U.Work` record via `telemetry/log-work`.
