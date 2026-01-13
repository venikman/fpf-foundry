#!/usr/bin/env bun
import { spawnSync } from "child_process";

type Step = {
  name: string;
  command: string;
  args: string[];
};

const steps: Step[] = [
  { name: "unicode-safety", command: "bun", args: ["develop/scripts/unicode_safety_check.ts", "--all"] },
  { name: "skillspec-validate", command: "bun", args: ["develop/tools/skill/validate.ts", "--all"] },
  { name: "inventory-generate", command: "bun", args: ["develop/tools/skill/inventory.ts"] },
  { name: "inventory-diff", command: "git", args: ["diff", "--exit-code", "--", "design/skills/SKILL_INVENTORY.md"] },
  { name: "inventory-checks", command: "bun", args: ["develop/scripts/skill_inventory_checks.ts"] },
  { name: "compile-verify", command: "bun", args: ["develop/tools/compile/verify.ts", "--model-cmd", "bun develop/tools/compile/mock-model.ts"] },
];

for (const step of steps) {
  const result = spawnSync(step.command, step.args, { stdio: "inherit" });
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    console.error(`Check step '${step.name}' failed: ${message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Check step '${step.name}' failed with exit code ${result.status}.`);
    process.exit(result.status ?? 1);
  }
}
