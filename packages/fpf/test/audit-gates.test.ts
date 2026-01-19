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

function timestampSlug(timestamp: string): string {
  return timestamp.replace(/[:.]/g, "-");
}

test("DoD verification and completion gating", () => {
  const context = "HarnessAudit";
  const contextRoot = path.join(repoRoot, "runtime", "contexts", context);

  rmSync(contextRoot, { recursive: true, force: true });

  try {
    const capabilityResult = runSkill("develop/skills/src/governance/declare-agent-capability/index.ts", [
      "--context",
      context,
      "--capability-id",
      "default",
      "--title",
      "Audit Capability",
      "--work-scope",
      "Harness audit context",
      "--work-measures",
      "Baseline checks",
      "--timestamp-start",
      "2026-01-02T00:00:00.500Z",
    ]);
    expect(capabilityResult.exitCode).toBe(0);
    const capabilityPath = path.join(contextRoot, "capabilities", "default.capability.yaml");
    expect(existsSync(capabilityPath)).toBe(true);

    const sessionIdPass = "session-pass";
    const startTimestamp = "2026-01-02T00:00:00.000Z";
    const startResult = runSkill("develop/skills/src/governance/start-agent-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionIdPass,
      "--capability-ref",
      capabilityPath,
      "--title",
      "Audit Gate Session",
      "--timestamp-start",
      startTimestamp,
    ]);
    expect(startResult.exitCode).toBe(0);

    const dodTimestamp = "2026-01-02T00:00:01.000Z";
    const dodResult = runSkill("develop/skills/src/audit/verify-definition-of-done/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionIdPass,
      "--allow-empty-diff",
      "true",
      "--test-command",
      "bun --version",
      "--check-command",
      "bun --version",
      "--timestamp-start",
      dodTimestamp,
    ]);
    expect(dodResult.exitCode).toBe(0);

    const dodReportPath = path.join(contextRoot, "audits", "dod", `${sessionIdPass}.${timestampSlug(dodTimestamp)}.dod.md`);
    expect(existsSync(dodReportPath)).toBe(true);
    const dodReport = readFileSync(dodReportPath, "utf8");
    expect(dodReport).toContain(`status: "pass"`);

    const completeTimestamp = "2026-01-02T00:00:02.000Z";
    const completeResult = runSkill("develop/skills/src/governance/complete-agent-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionIdPass,
      "--status",
      "success",
      "--summary",
      "All checks passed.",
      "--dod-report",
      dodReportPath,
      "--timestamp-start",
      completeTimestamp,
    ]);
    expect(completeResult.exitCode).toBe(0);

    const sessionPathPass = path.join(contextRoot, "sessions", `${sessionIdPass}.session.md`);
    const sessionContentPass = readFileSync(sessionPathPass, "utf8");
    expect(sessionContentPass).toContain(`outcome: "success"`);
    expect(sessionContentPass).toContain(`dod_status: "pass"`);

    const sessionIdMissing = "session-missing";
    const startMissingResult = runSkill("develop/skills/src/governance/start-agent-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionIdMissing,
      "--capability-ref",
      capabilityPath,
      "--title",
      "Missing DoD Session",
      "--timestamp-start",
      "2026-01-02T00:00:03.000Z",
    ]);
    expect(startMissingResult.exitCode).toBe(0);

    const completeMissingResult = runSkill("develop/skills/src/governance/complete-agent-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionIdMissing,
      "--status",
      "success",
      "--summary",
      "Attempted success without DoD.",
      "--timestamp-start",
      "2026-01-02T00:00:04.000Z",
    ]);
    expect(completeMissingResult.exitCode).toBe(0);

    const sessionPathMissing = path.join(contextRoot, "sessions", `${sessionIdMissing}.session.md`);
    const sessionContentMissing = readFileSync(sessionPathMissing, "utf8");
    expect(sessionContentMissing).toContain(`outcome: "needs-review"`);
    expect(sessionContentMissing).toContain(`dod_status: "missing"`);

    const sessionIdFail = "session-fail";
    const startFailResult = runSkill("develop/skills/src/governance/start-agent-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionIdFail,
      "--capability-ref",
      capabilityPath,
      "--title",
      "Failing DoD Session",
      "--timestamp-start",
      "2026-01-02T00:00:05.000Z",
    ]);
    expect(startFailResult.exitCode).toBe(0);

    const dodFailTimestamp = "2026-01-02T00:00:06.000Z";
    const dodFailResult = runSkill("develop/skills/src/audit/verify-definition-of-done/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionIdFail,
      "--allow-empty-diff",
      "true",
      "--required-artifacts",
      "runtime/contexts/HarnessAudit/sessions/missing.session.md",
      "--test-command",
      "bun --version",
      "--check-command",
      "bun --version",
      "--timestamp-start",
      dodFailTimestamp,
    ]);
    expect(dodFailResult.exitCode).not.toBe(0);

    const dodFailReportPath = path.join(contextRoot, "audits", "dod", `${sessionIdFail}.${timestampSlug(dodFailTimestamp)}.dod.md`);
    expect(existsSync(dodFailReportPath)).toBe(true);
    const dodFailReport = readFileSync(dodFailReportPath, "utf8");
    expect(dodFailReport).toContain(`status: "fail"`);

    const proxyTimestamp = "2026-01-02T00:00:07.000Z";
    const proxyResult = runSkill("develop/skills/src/audit/proxy-audit-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionIdPass,
      "--verdict",
      "needs-review",
      "--findings",
      "Missing audit artifacts",
      "--timestamp-start",
      proxyTimestamp,
    ]);
    expect(proxyResult.exitCode).toBe(0);

    const proxyReportPath = path.join(contextRoot, "audits", "proxy", `${sessionIdPass}.${timestampSlug(proxyTimestamp)}.proxy-audit.md`);
    expect(existsSync(proxyReportPath)).toBe(true);
    const proxyReport = readFileSync(proxyReportPath, "utf8");
    expect(proxyReport).toContain(`verdict: "needs-review"`);
  } finally {
    rmSync(contextRoot, { recursive: true, force: true });
  }
});
