import { spawnSync } from "child_process";
import { accessSync, constants, existsSync } from "fs";
import { join } from "path";
import { CliError } from "../lib/errors.ts";
import { toRootRelativePosixPath } from "../lib/paths.ts";

type CommandContext = {
  rootDir: string;
};

type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export async function runSessionAsync(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    throw new CliError(
      "HELP",
      [
        "Usage: fpf session <subcommand> [args]",
        "",
        "Subcommands:",
        "  start     Start a new agent session",
        "  handoff   Record a handoff between agents",
        "  complete  Complete an agent session",
        "  audit     Generate a DoD or proxy audit report",
      ].join("\n"),
      0,
    );
  }

  const [subcommand, ...rest] = argv;
  if (subcommand === "start") {
    return runSessionStart(ctx, rest);
  }
  if (subcommand === "handoff") {
    return runSessionHandoff(ctx, rest);
  }
  if (subcommand === "complete") {
    return runSessionComplete(ctx, rest);
  }
  if (subcommand === "audit") {
    return runSessionAudit(ctx, rest);
  }

  throw new CliError("UNKNOWN_ARG", `Unknown session subcommand '${subcommand}'.`, 1);
}

async function runSessionStart(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  if (hasHelpFlag(argv)) {
    throw new CliError(
      "HELP",
      [
        "Usage: fpf session start --context <Context> --session-id <Id> --title <Title> [options]",
        "",
        "Options:",
        "  --capability-ref <path>  Capability declaration path (defaults to context default).",
        "  --purpose <text>         Session purpose summary.",
        "  --initiated-by <text>    Initiator reference.",
        "  --agent-type <type>      Agent type (strategist, executor, etc).",
        "  --agent-model <model>    Agent model identifier.",
        "  --role-assignment <ref>  RoleAssignment for U.Work logging.",
        "  --decisions \"a; b\"       Semicolon-delimited DRR refs.",
        "  --timestamp-start <iso>  ISO-8601 timestamp for deterministic output.",
      ].join("\n"),
      0,
    );
  }

  ensureRootWritable(ctx.rootDir);
  const scriptPath = resolveSkillScript(ctx.rootDir, "governance/start-agent-session");
  const result = runSkillScript(scriptPath, argv, ctx.rootDir);
  return buildResult({
    ctx,
    subcommand: "start",
    skillId: "governance/start-agent-session",
    result,
    successPrefix: "Session started:",
    createdKind: "created",
  });
}

async function runSessionHandoff(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  if (hasHelpFlag(argv)) {
    throw new CliError(
      "HELP",
      [
        "Usage: fpf session handoff --context <Context> --session-id <Id> --to-agent-type <Type> [options]",
        "",
        "Options:",
        "  --from-agent-type <type>      Source agent type (default: strategist).",
        "  --instructions \"a; b\"         Semicolon-delimited instruction list.",
        "  --acceptance-criteria \"a; b\"  Semicolon-delimited acceptance criteria.",
        "  --constraints \"a; b\"          Semicolon-delimited constraints.",
        "  --artifacts \"a; b\"            Semicolon-delimited artifact paths.",
        "  --notes <text>                 Optional notes.",
        "  --agent-model <model>          Agent model identifier.",
        "  --role-assignment <ref>        RoleAssignment for U.Work logging.",
        "  --decisions \"a; b\"             Semicolon-delimited DRR refs.",
        "  --timestamp-start <iso>        ISO-8601 timestamp for deterministic output.",
      ].join("\n"),
      0,
    );
  }

  ensureRootWritable(ctx.rootDir);
  const scriptPath = resolveSkillScript(ctx.rootDir, "governance/handoff-to-agent");
  const result = runSkillScript(scriptPath, argv, ctx.rootDir);
  return buildResult({
    ctx,
    subcommand: "handoff",
    skillId: "governance/handoff-to-agent",
    result,
    successPrefix: "Handoff recorded:",
    createdKind: "created",
  });
}

async function runSessionComplete(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  if (hasHelpFlag(argv)) {
    throw new CliError(
      "HELP",
      [
        "Usage: fpf session complete --context <Context> --session-id <Id> --status <status> [options]",
        "",
        "Options:",
        "  --allow-recomplete <bool>  Allow re-completion when outcome is needs-review.",
        "  --summary <text>            Completion summary.",
        "  --dod-report <path>         DoD report path (required for success outcome).",
        "  --roc-report <path>         Precomputed RoC compliance report.",
        "  --roc-path <path>           RoC file (run compliance check automatically).",
        "  --used-tools \"a; b\"         Semicolon-delimited tools used.",
        "  --approvals \"a; b\"          Semicolon-delimited approvals.",
        "  --agent-type <type>         Agent type.",
        "  --agent-model <model>       Agent model identifier.",
        "  --role-assignment <ref>     RoleAssignment for U.Work logging.",
        "  --decisions \"a; b\"          Semicolon-delimited DRR refs.",
        "  --timestamp-start <iso>     ISO-8601 timestamp for deterministic output.",
      ].join("\n"),
      0,
    );
  }

  ensureRootWritable(ctx.rootDir);
  const scriptPath = resolveSkillScript(ctx.rootDir, "governance/complete-agent-session");
  const result = runSkillScript(scriptPath, argv, ctx.rootDir);
  return buildResult({
    ctx,
    subcommand: "complete",
    skillId: "governance/complete-agent-session",
    result,
    successPrefix: "Session completed:",
    createdKind: "updated",
  });
}

async function runSessionAudit(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  if (hasHelpFlag(argv)) {
    throw new CliError(
      "HELP",
      [
        "Usage: fpf session audit --context <Context> --session-id <Id> [options]",
        "",
        "Options (DoD report):",
        "  --required-artifacts \"a; b\"  Semicolon-delimited required artifact paths.",
        "  --allow-empty-diff <bool>     Allow clean git diff (default: false).",
        "  --test-command \"...\"          Test command (default: bun test).",
        "  --check-command \"...\"         Check command (default: bun packages/fpf/bin/fpf check).",
        "",
        "Options (Proxy audit):",
        "  --verdict <pass|needs-review|fail>  Proxy audit verdict.",
        "  --findings \"a; b\"                    Semicolon-delimited findings.",
        "  --recommendations \"a; b\"             Semicolon-delimited recommendations.",
        "  --artifacts \"a; b\"                   Semicolon-delimited artifact paths.",
        "  --dod-report <path>                   Related DoD report path.",
        "",
        "Shared options:",
        "  --notes <text>",
        "  --agent-type <type>",
        "  --agent-model <model>",
        "  --role-assignment <ref>",
        "  --decisions \"a; b\"",
        "  --timestamp-start <iso>",
      ].join("\n"),
      0,
    );
  }

  ensureRootWritable(ctx.rootDir);
  const isProxy = hasFlag(argv, "--verdict");
  const skillId = isProxy ? "audit/proxy-audit-session" : "audit/verify-definition-of-done";
  const scriptPath = resolveSkillScript(ctx.rootDir, skillId);
  const result = runSkillScript(scriptPath, argv, ctx.rootDir);
  return buildResult({
    ctx,
    subcommand: "audit",
    skillId,
    result,
    successPrefix: isProxy ? "Proxy audit recorded:" : "DoD report generated:",
    createdKind: "created",
    auditType: isProxy ? "proxy" : "dod",
  });
}

function runSkillScript(scriptPath: string, args: string[], cwd: string): RunResult {
  const result = spawnSync("bun", [scriptPath, ...args], { cwd, env: { ...process.env }, encoding: "utf8" });
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    throw new CliError("SKILL_FAILED", `Failed to run skill: ${message}`, 1);
  }
  if (result.signal) {
    throw new CliError("SKILL_FAILED", `Skill terminated by signal ${result.signal}`, 1);
  }
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function buildResult(input: {
  ctx: CommandContext;
  subcommand: "start" | "handoff" | "complete" | "audit";
  skillId: string;
  result: RunResult;
  successPrefix: string;
  createdKind: "created" | "updated";
  auditType?: "dod" | "proxy";
}): { exitCode: number; json: unknown; stdout: string[]; stderr: string[] } {
  const stdoutLines = splitLines(input.result.stdout);
  const stderrLines = splitLines(input.result.stderr);

  if (input.result.exitCode !== 0) {
    return {
      exitCode: input.result.exitCode,
      json: {
        ok: false,
        command: "session",
        subcommand: input.subcommand,
        root: input.ctx.rootDir,
        error: {
          code: "SKILL_FAILED",
          message: `Skill '${input.skillId}' failed with exit code ${input.result.exitCode}.`,
          ...(input.result.stderr.trim().length > 0 ? { details: { stderr: input.result.stderr.trim() } } : {}),
        },
      },
      stdout: stdoutLines,
      stderr: stderrLines,
    };
  }

  const absolutePath = extractPath(input.result.stdout, input.successPrefix);
  const relativePath = absolutePath ? toRootRelativePosixPath(absolutePath, input.ctx.rootDir) : undefined;
  const created = input.createdKind === "created" && relativePath ? [relativePath] : [];
  const updated = input.createdKind === "updated" && relativePath ? [relativePath] : [];

  const baseJson: Record<string, unknown> = {
    ok: true,
    command: "session",
    subcommand: input.subcommand,
    root: input.ctx.rootDir,
    created,
    updated,
  };

  if (relativePath) {
    if (input.subcommand === "handoff") {
      baseJson.handoffPath = relativePath;
    } else if (input.subcommand === "audit") {
      baseJson.auditReportPath = relativePath;
    } else {
      baseJson.sessionPath = relativePath;
    }
  }

  if (input.subcommand === "audit" && input.auditType) {
    baseJson.auditType = input.auditType;
  }

  return {
    exitCode: 0,
    json: baseJson,
    stdout: stdoutLines,
    stderr: stderrLines,
  };
}

function extractPath(output: string, prefix: string): string | null {
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim();
    }
  }
  return null;
}

function splitLines(text: string): string[] {
  const trimmed = text.trimEnd();
  if (trimmed.length === 0) {
    return [];
  }
  return trimmed.split(/\r?\n/);
}

function hasHelpFlag(argv: string[]): boolean {
  return argv.includes("-h") || argv.includes("--help");
}

function hasFlag(argv: string[], flag: string): boolean {
  if (argv.includes(flag)) return true;
  return argv.some((entry) => entry.startsWith(`${flag}=`));
}

function resolveSkillScript(rootDir: string, skillId: string): string {
  const scriptPath = join(rootDir, "develop", "skills", "src", ...skillId.split("/"), "index.ts");
  if (!existsSync(scriptPath)) {
    throw new CliError(
      "SKILL_NOT_FOUND",
      `Skill implementation not found for '${skillId}'. Expected ${toRootRelativePosixPath(scriptPath, rootDir)}.`,
      1,
    );
  }
  return scriptPath;
}

function ensureRootWritable(rootDir: string): void {
  if (!existsSync(rootDir)) {
    throw new CliError("ROOT_NOT_FOUND", `Root not found: ${rootDir}`, 1);
  }
  try {
    accessSync(rootDir, constants.W_OK);
  } catch {
    throw new CliError("ROOT_NOT_WRITABLE", `Root is not writable: ${rootDir}`, 1);
  }
}
