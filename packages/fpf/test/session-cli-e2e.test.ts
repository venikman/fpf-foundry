import { expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "fs";
import * as path from "path";

type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const decoder = new TextDecoder();
const repoRoot = process.cwd();
const fpfBin = path.join("packages", "fpf", "bin", "fpf");

function runFpf(args: string[]): RunResult {
  const proc = Bun.spawnSync({
    cmd: ["bun", fpfBin, ...args],
    stdout: "pipe",
    stderr: "pipe",
    cwd: repoRoot,
    env: { ...process.env },
  });

  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout ? decoder.decode(proc.stdout) : "",
    stderr: proc.stderr ? decoder.decode(proc.stderr) : "",
  };
}

function runSkill(scriptPath: string, args: string[]): RunResult {
  const proc = Bun.spawnSync({
    cmd: ["bun", scriptPath, ...args],
    stdout: "pipe",
    stderr: "pipe",
    cwd: repoRoot,
    env: { ...process.env },
  });

  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout ? decoder.decode(proc.stdout) : "",
    stderr: proc.stderr ? decoder.decode(proc.stderr) : "",
  };
}

test("session CLI workflow smoke test", () => {
  const context = "CliHarness";
  const sessionId = "cli-001";
  const contextRoot = path.join(repoRoot, "runtime", "contexts", context);

  rmSync(contextRoot, { recursive: true, force: true });

  try {
    const capabilityResult = runSkill("develop/skills/src/governance/declare-agent-capability/index.ts", [
      "--context",
      context,
      "--capability-id",
      "default",
      "--title",
      "CLI Capability",
      "--work-scope",
      "CLI session testing",
      "--work-measures",
      "Smoke check",
    ]);
    expect(capabilityResult.exitCode).toBe(0);

    const capabilityPath = path.join(contextRoot, "capabilities", "default.capability.yaml");
    expect(existsSync(capabilityPath)).toBe(true);

    const startResult = runFpf([
      "session",
      "start",
      "--context",
      context,
      "--session-id",
      sessionId,
      "--capability-ref",
      capabilityPath,
      "--title",
      "CLI Session",
      "--agent-type",
      "strategist",
      "--agent-model",
      "gpt-5.2-codex",
      "--json",
    ]);
    expect(startResult.exitCode).toBe(0);
    const startPayload = JSON.parse(startResult.stdout) as { sessionPath?: string };
    const sessionPath = startPayload.sessionPath ?? "";
    expect(sessionPath.length).toBeGreaterThan(0);
    expect(existsSync(path.join(repoRoot, sessionPath))).toBe(true);

    const handoffResult = runFpf([
      "session",
      "handoff",
      "--context",
      context,
      "--session-id",
      sessionId,
      "--to-agent-type",
      "executor",
      "--from-agent-type",
      "strategist",
      "--instructions",
      "Apply updates; run checks",
      "--json",
    ]);
    expect(handoffResult.exitCode).toBe(0);
    const handoffPayload = JSON.parse(handoffResult.stdout) as { handoffPath?: string };
    const handoffPath = handoffPayload.handoffPath ?? "";
    expect(handoffPath.length).toBeGreaterThan(0);
    expect(existsSync(path.join(repoRoot, handoffPath))).toBe(true);

    const completeNeedsReview = runFpf([
      "session",
      "complete",
      "--context",
      context,
      "--session-id",
      sessionId,
      "--status",
      "needs-review",
      "--summary",
      "Awaiting human review.",
      "--json",
    ]);
    expect(completeNeedsReview.exitCode).toBe(0);
    const sessionContentNeedsReview = readFileSync(path.join(repoRoot, sessionPath), "utf8");
    expect(sessionContentNeedsReview).toContain("outcome: \"needs-review\"");

    const auditResult = runFpf([
      "session",
      "audit",
      "--context",
      context,
      "--session-id",
      sessionId,
      "--allow-empty-diff",
      "true",
      "--test-command",
      "bun --version",
      "--check-command",
      "bun --version",
      "--json",
    ]);
    expect(auditResult.exitCode).toBe(0);
    const auditPayload = JSON.parse(auditResult.stdout) as { auditReportPath?: string };
    const auditReportPath = auditPayload.auditReportPath ?? "";
    expect(auditReportPath.length).toBeGreaterThan(0);
    expect(existsSync(path.join(repoRoot, auditReportPath))).toBe(true);

    const completeSuccess = runFpf([
      "session",
      "complete",
      "--context",
      context,
      "--session-id",
      sessionId,
      "--status",
      "success",
      "--allow-recomplete",
      "true",
      "--summary",
      "DoD passed and audit recorded.",
      "--dod-report",
      auditReportPath,
      "--json",
    ]);
    expect(completeSuccess.exitCode).toBe(0);
    const sessionContentSuccess = readFileSync(path.join(repoRoot, sessionPath), "utf8");
    expect(sessionContentSuccess).toContain("outcome: \"success\"");
    expect(sessionContentSuccess).toContain(`dod_report: "${auditReportPath}"`);
  } finally {
    rmSync(contextRoot, { recursive: true, force: true });
  }
});
