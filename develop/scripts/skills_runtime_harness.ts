#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

type Scenario = {
  name: string;
  command: string;
  args: string[];
  expectedPaths: string[];
  expectedFilesForDigest: string[];
};

const repoRoot = process.cwd();
const fixedNow = (process.env.FPF_FIXED_NOW ?? "2026-01-01T00:00:00.000Z").trim();
const keepSandbox = process.env.FPF_HARNESS_KEEP_SANDBOX === "1";

const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fpf-skills-harness-"));
const sandboxRepo = path.join(sandboxRoot, "repo");

try {
  copyRepo(repoRoot, sandboxRepo);
  initGitRepo(sandboxRepo);
  const baselineCommit = runCapture("git", ["rev-parse", "HEAD"], { cwd: sandboxRepo }).trim();

  const scenarios = buildScenarios({ sandboxRepo, fixedNow });

  for (const scenario of scenarios) {
    const first = runScenarioOnce({ sandboxRepo, baselineCommit, scenario, fixedNow });
    const second = runScenarioOnce({ sandboxRepo, baselineCommit, scenario, fixedNow });
    if (first !== second) {
      const dir = path.join(sandboxRoot, "artifacts");
      fs.mkdirSync(dir, { recursive: true });
      const a = path.join(dir, `${scenario.name}.run1.txt`);
      const b = path.join(dir, `${scenario.name}.run2.txt`);
      fs.writeFileSync(a, first, "utf8");
      fs.writeFileSync(b, second, "utf8");
      console.error(`Skill runtime harness failed: non-deterministic output for '${scenario.name}'.`);
      console.error(`- Run 1: ${a}`);
      console.error(`- Run 2: ${b}`);
      console.error(`Sandbox: ${sandboxRepo}`);
      process.exit(1);
    }

    console.log(`✔ ${scenario.name}`);
  }

  console.log("Skill runtime harness passed.");
} finally {
  if (keepSandbox) {
    console.log(`Keeping sandbox: ${sandboxRepo}`);
  } else {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  }
}

function buildScenarios(input: { sandboxRepo: string; fixedNow: string }): Scenario[] {
  const workFile = expectedWorkFile(input.fixedNow);
  const scenarios: Scenario[] = [
    {
      name: "telemetry-log-work",
      command: "bun",
      args: [
        "develop/skills/src/telemetry/log-work/index.ts",
        "--method",
        "telemetry/log-work",
        "--role-assignment",
        "Harness",
        "--context",
        "Harness",
        "--action",
        "Harness work log.",
        "--outputs",
        "design/skills/SKILL_INVENTORY.md",
      ],
      expectedPaths: [workFile],
      expectedFilesForDigest: [workFile],
    },
    {
      name: "design-mint-name",
      command: "bun",
      args: [
        "develop/skills/src/design/mint-name/index.ts",
        "--context",
        "Harness",
        "--id",
        "example-name",
        "--label",
        "Example Name",
        "--mds",
        "A minimal definitional statement for harness tests.",
      ],
      expectedPaths: ["runtime/contexts/Harness/design/names/example-name.md", workFile],
      expectedFilesForDigest: ["runtime/contexts/Harness/design/names/example-name.md", workFile],
    },
    {
      name: "planning-create-workplan",
      command: "bun",
      args: [
        "develop/skills/src/planning/create-workplan/index.ts",
        "--context",
        "Harness",
        "--id",
        "harness-plan",
        "--title",
        "Harness Plan",
        "--intent",
        "Prove deterministic skill execution in a sandbox.",
        "--deliverables",
        "Stable outputs; Stable diffs",
      ],
      expectedPaths: ["runtime/contexts/Harness/planning/workplans/harness-plan.md", workFile],
      expectedFilesForDigest: ["runtime/contexts/Harness/planning/workplans/harness-plan.md", workFile],
    },
    {
      name: "design-init-context",
      command: "bun",
      args: ["develop/skills/src/design/init-context/index.ts", "--context", "Harness", "--description", "Harness context for deterministic skill execution tests."],
      expectedPaths: ["runtime/contexts/Harness/README.md", "runtime/contexts/Harness/design/names", "runtime/contexts/Harness/planning/workplans", workFile],
      expectedFilesForDigest: ["runtime/contexts/Harness/README.md", workFile],
    },
  ];

  const nextDrrPath = computeNextDrrPath(input.sandboxRepo, "Harness Decision");
  scenarios.push({
    name: "design-record-drr",
    command: "bun",
    args: [
      "develop/skills/src/design/record-drr/index.ts",
      "--title",
      "Harness Decision",
      "--context",
      "Need deterministic skill execution harness.",
      "--decision",
      "Add runtime harness to bun run check.",
      "--work-context",
      "Harness",
    ],
    expectedPaths: [nextDrrPath, workFile],
    expectedFilesForDigest: [nextDrrPath, workFile],
  });

  const scaffoldId = computeAvailableSkillId(input.sandboxRepo, "design/harness-skill");
  scenarios.push({
    name: "design-scaffold-skill",
    command: "bun",
    args: [
      "develop/skills/src/design/scaffold-skill/index.ts",
      "--skill-id",
      scaffoldId,
      "--name",
      "Harness Skill",
      "--summary",
      "Skill scaffolded by harness.",
      "--work-context",
      "Harness",
    ],
    expectedPaths: [
      `design/skills/${scaffoldId}/skill.json`,
      `design/skills/${scaffoldId}/SKILL.md`,
      `develop/skills/src/${scaffoldId}/index.ts`,
      `develop/skills/src/${scaffoldId}/fixtures/input.json`,
      `develop/skills/src/${scaffoldId}/fixtures/expected.json`,
      `develop/skills/src/${scaffoldId}/index.test.ts`,
      "design/skills/SKILL_INVENTORY.md",
      "design/skills/SKILL_INDEX.json",
      workFile,
    ],
    expectedFilesForDigest: [
      `design/skills/${scaffoldId}/skill.json`,
      `design/skills/${scaffoldId}/SKILL.md`,
      `develop/skills/src/${scaffoldId}/index.ts`,
      `develop/skills/src/${scaffoldId}/fixtures/input.json`,
      `develop/skills/src/${scaffoldId}/fixtures/expected.json`,
      `develop/skills/src/${scaffoldId}/index.test.ts`,
      "design/skills/SKILL_INVENTORY.md",
      "design/skills/SKILL_INDEX.json",
      workFile,
    ],
  });

  return scenarios;
}

function expectedWorkFile(fixedNowValue: string): string {
  const parsed = new Date(fixedNowValue);
  if (Number.isNaN(parsed.getTime())) {
    console.error(`Invalid FPF_FIXED_NOW '${fixedNowValue}'. Expected an ISO-8601 date-time.`);
    process.exit(1);
  }
  const isoTimestamp = parsed.toISOString();
  const timestamp = isoTimestamp.replace(/[:.]/g, "-");
  return `runtime/contexts/Harness/telemetry/work/work-${timestamp}.md`;
}

function computeNextDrrPath(root: string, title: string): string {
  const decisionsDir = path.join(root, "design", "decisions");
  const files = fs.existsSync(decisionsDir) ? fs.readdirSync(decisionsDir).filter((entry) => entry.endsWith(".md")) : [];

  let maxId = 0;
  for (const file of files) {
    const match = file.match(/^(\d+)-/);
    if (!match) continue;
    const value = Number.parseInt(match[1] ?? "0", 10);
    if (value > maxId) maxId = value;
  }

  const nextId = String(maxId + 1).padStart(3, "0");
  const kebabTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `design/decisions/${nextId}-${kebabTitle}.md`;
}

function computeAvailableSkillId(root: string, baseSkillId: string): string {
  let candidate = baseSkillId;
  let suffix = 2;
  while (true) {
    const specPath = path.join(root, "design", "skills", ...candidate.split("/"), "skill.json");
    if (!fs.existsSync(specPath)) {
      return candidate;
    }
    candidate = `${baseSkillId}-${suffix}`;
    suffix += 1;
  }
}

function runScenarioOnce(input: { sandboxRepo: string; baselineCommit: string; scenario: Scenario; fixedNow: string }): string {
  runOrExit("git", ["reset", "--hard", input.baselineCommit], { cwd: input.sandboxRepo });
  runOrExit("git", ["clean", "-fdx"], { cwd: input.sandboxRepo });

  const env = {
    ...process.env,
    FPF_FIXED_NOW: input.fixedNow,
    POSTHOG_API_KEY: "",
    POSTHOG_DISTINCT_ID: "",
    POSTHOG_INCLUDE_ACTION: "0",
  };

  runOrExit(input.scenario.command, input.scenario.args, { cwd: input.sandboxRepo, env });

  for (const relPath of input.scenario.expectedPaths) {
    const absPath = path.join(input.sandboxRepo, relPath);
    if (!fs.existsSync(absPath)) {
      console.error(`Skill runtime harness failed: missing expected output '${relPath}' for '${input.scenario.name}'.`);
      console.error(`Sandbox: ${input.sandboxRepo}`);
      process.exit(1);
    }
  }

  const digests: string[] = [];
  for (const relPath of input.scenario.expectedFilesForDigest) {
    const absPath = path.join(input.sandboxRepo, relPath);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      digests.push(`${relPath}\t(missing file)`);
      continue;
    }
    const content = fs.readFileSync(absPath);
    const hash = createHash("sha256").update(content).digest("hex");
    digests.push(`${relPath}\tsha256:${hash}`);
  }

  runOrExit("git", ["add", "-A"], { cwd: input.sandboxRepo });
  const diff = runCapture("git", ["diff", "--cached", "--no-color"], { cwd: input.sandboxRepo });

  return [`scenario=${input.scenario.name}`, `fixed_now=${input.fixedNow}`, "", "digests:", ...digests.sort(), "", "git_diff_cached:", diff.trimEnd(), ""].join("\n");
}

function initGitRepo(root: string): void {
  runOrExit("git", ["init"], { cwd: root });
  runOrExit("git", ["config", "user.email", "harness@local"], { cwd: root });
  runOrExit("git", ["config", "user.name", "Harness"], { cwd: root });
  runOrExit("git", ["add", "-A"], { cwd: root });
  runOrExit("git", ["commit", "-m", "baseline"], { cwd: root });
}

function copyRepo(src: string, dest: string): void {
  const excludePrefixes = [".git", "node_modules", ".bun", "dist", "coverage", "runtime/out", "runtime/contexts"];
  const excludeExact = new Set(["runtime/skills/index.json"]);

  fs.mkdirSync(dest, { recursive: true });

  fs.cpSync(src, dest, {
    recursive: true,
    dereference: true,
    filter: (sourcePath) => {
      const rel = path.relative(src, sourcePath);
      if (!rel || rel.length === 0) {
        return true;
      }
      const relPosix = rel.split(path.sep).join("/");
      if (excludeExact.has(relPosix)) {
        return false;
      }
      for (const prefix of excludePrefixes) {
        if (relPosix === prefix || relPosix.startsWith(`${prefix}/`)) {
          return false;
        }
      }
      return true;
    },
  });
}

function runOrExit(command: string, args: string[], options: { cwd: string; env?: NodeJS.ProcessEnv } = { cwd: process.cwd() }): void {
  const result = spawnSync(command, args, { cwd: options.cwd, env: options.env, encoding: "utf8" });
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    console.error(`Command failed: ${command}\n${message}`);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`Command terminated by signal ${result.signal}: ${command}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Command failed (${result.status}): ${command} ${args.join(" ")}`);
    if (result.stdout?.trim().length > 0) {
      console.error(result.stdout.trimEnd());
    }
    if (result.stderr?.trim().length > 0) {
      console.error(result.stderr.trimEnd());
    }
    process.exit(result.status ?? 1);
  }
}

function runCapture(command: string, args: string[], options: { cwd: string; env?: NodeJS.ProcessEnv }): string {
  const result = spawnSync(command, args, { cwd: options.cwd, env: options.env, encoding: "utf8" });
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    console.error(`Command failed: ${command}\n${message}`);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`Command terminated by signal ${result.signal}: ${command}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Command failed (${result.status}): ${command} ${args.join(" ")}`);
    if (result.stdout?.trim().length > 0) {
      console.error(result.stdout.trimEnd());
    }
    if (result.stderr?.trim().length > 0) {
      console.error(result.stderr.trimEnd());
    }
    process.exit(result.status ?? 1);
  }
  return result.stdout ?? "";
}
