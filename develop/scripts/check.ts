#!/usr/bin/env bun
import { spawnSync } from "node:child_process";

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
  { name: "skill-index-generate", command: "bun", args: ["develop/tools/skill/index.ts", "--out", "design/skills/SKILL_INDEX.json"] },
  { name: "skill-index-diff", command: "git", args: ["diff", "--exit-code", "--", "design/skills/SKILL_INDEX.json"] },
  { name: "codex-skills-sync", command: "bun", args: ["develop/tools/codex/sync-skills.ts"] },
  { name: "codex-skills-diff", command: "git", args: ["diff", "--exit-code", "--", ".codex/skills"] },
  { name: "inventory-checks", command: "bun", args: ["develop/scripts/skill_inventory_checks.ts"] },
  { name: "skills-runtime-harness", command: "bun", args: ["develop/scripts/skills_runtime_harness.ts"] },
  { name: "compile-verify", command: "bun", args: ["develop/tools/compile/verify.ts", "--model-cmd", "bun develop/tools/compile/mock-model.ts"] },
];

for (const step of steps) {
  const cmd = [step.command, ...step.args].join(" ");
  const result = spawnSync(step.command, step.args, { stdio: "inherit" });
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    console.error(`Check step '${step.name}' failed: ${message}\nCommand: ${cmd}`);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`Check step '${step.name}' terminated by signal ${result.signal}.\nCommand: ${cmd}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Check step '${step.name}' failed with exit code ${result.status}.\nCommand: ${cmd}`);
    process.exit(result.status ?? 1);
  }
}
