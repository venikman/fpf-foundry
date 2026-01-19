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

test("RoC compliance report enforces completion outcomes", () => {
  const context = "HarnessRoC";
  const contextRoot = path.join(repoRoot, "runtime", "contexts", context);

  rmSync(contextRoot, { recursive: true, force: true });

  try {
    const capabilityResult = runSkill("develop/skills/src/governance/declare-agent-capability/index.ts", [
      "--context",
      context,
      "--capability-id",
      "default",
      "--title",
      "RoC Capability",
      "--work-scope",
      "Harness RoC context",
      "--work-measures",
      "Baseline checks",
      "--timestamp-start",
      "2026-01-03T00:00:00.000Z",
    ]);
    expect(capabilityResult.exitCode).toBe(0);
    const capabilityPath = path.join(contextRoot, "capabilities", "default.capability.yaml");
    expect(existsSync(capabilityPath)).toBe(true);

    const sessionId = "session-roc";
    const startResult = runSkill("develop/skills/src/governance/start-agent-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--capability-ref",
      capabilityPath,
      "--title",
      "RoC Session",
      "--timestamp-start",
      "2026-01-03T00:00:01.000Z",
    ]);
    expect(startResult.exitCode).toBe(0);

    const rocResult = runSkill("develop/skills/src/governance/define-roc/index.ts", [
      "--context",
      context,
      "--roc-id",
      "roc-default",
      "--constraints",
      "No destructive commands",
      "--allowed-tools",
      "rg; bun",
      "--forbidden-tools",
      "rm",
      "--violation-outcome",
      "blocked",
      "--timestamp-start",
      "2026-01-03T00:00:02.000Z",
    ]);
    expect(rocResult.exitCode).toBe(0);

    const rocPath = path.join(contextRoot, "roc", "roc-default.roc.yaml");
    expect(existsSync(rocPath)).toBe(true);

    const rocCheckTimestamp = "2026-01-03T00:00:03.000Z";
    const rocCheckResult = runSkill("develop/skills/src/governance/check-roc-compliance/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--roc-path",
      rocPath,
      "--used-tools",
      "rm",
      "--timestamp-start",
      rocCheckTimestamp,
    ]);
    expect(rocCheckResult.exitCode).not.toBe(0);

    const rocReportPath = path.join(contextRoot, "audits", "roc", `${sessionId}.${timestampSlug(rocCheckTimestamp)}.roc.md`);
    expect(existsSync(rocReportPath)).toBe(true);
    const rocReport = readFileSync(rocReportPath, "utf8");
    expect(rocReport).toContain("status: \"violations\"");
    expect(rocReport).toContain("violation_outcome: \"blocked\"");

    const completeResult = runSkill("develop/skills/src/governance/complete-agent-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--status",
      "needs-review",
      "--summary",
      "RoC violations present.",
      "--roc-report",
      rocReportPath,
      "--timestamp-start",
      "2026-01-03T00:00:04.000Z",
    ]);
    expect(completeResult.exitCode).toBe(0);

    const sessionPath = path.join(contextRoot, "sessions", `${sessionId}.session.md`);
    const sessionContent = readFileSync(sessionPath, "utf8");
    expect(sessionContent).toContain("outcome: \"blocked\"");
    expect(sessionContent).toContain("roc_status: \"violations\"");
  } finally {
    rmSync(contextRoot, { recursive: true, force: true });
  }
});

test("escalation and approval records are created", () => {
  const context = "HarnessHuman";
  const contextRoot = path.join(repoRoot, "runtime", "contexts", context);

  rmSync(contextRoot, { recursive: true, force: true });

  try {
    const sessionId = "session-human";
    const escalationResult = runSkill("develop/skills/src/workflow/escalate-to-human/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--reason",
      "Requires human review",
      "--severity",
      "high",
      "--timestamp-start",
      "2026-01-04T00:00:00.000Z",
    ]);
    expect(escalationResult.exitCode).toBe(0);

    const escalationPath = path.join(contextRoot, "escalations", `${sessionId}.1.escalation.md`);
    expect(existsSync(escalationPath)).toBe(true);

    const resolveTimestamp = "2026-01-04T00:00:01.000Z";
    const resolveResult = runSkill("develop/skills/src/workflow/resolve-escalation/index.ts", [
      "--context",
      context,
      "--escalation-id",
      `${sessionId}.1`,
      "--decision",
      "resolved",
      "--resolved-by",
      "human",
      "--timestamp-start",
      resolveTimestamp,
    ]);
    expect(resolveResult.exitCode).toBe(0);

    const resolutionPath = path.join(contextRoot, "escalations", `${sessionId}.1.${timestampSlug(resolveTimestamp)}.resolution.md`);
    expect(existsSync(resolutionPath)).toBe(true);
    const resolutionContent = readFileSync(resolutionPath, "utf8");
    expect(resolutionContent).toContain("decision: \"resolved\"");

    const requestResult = runSkill("develop/skills/src/workflow/request-approval/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--approval-id",
      "schema-change",
      "--summary",
      "Request approval for schema changes",
      "--requested-by",
      "strategist",
      "--timestamp-start",
      "2026-01-04T00:00:02.000Z",
    ]);
    expect(requestResult.exitCode).toBe(0);

    const approvalPath = path.join(contextRoot, "approvals", `${sessionId}.schema-change.approval.md`);
    expect(existsSync(approvalPath)).toBe(true);

    const responseTimestamp = "2026-01-04T00:00:03.000Z";
    const responseResult = runSkill("develop/skills/src/workflow/respond-to-approval/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--approval-id",
      "schema-change",
      "--decision",
      "approved",
      "--responded-by",
      "human",
      "--timestamp-start",
      responseTimestamp,
    ]);
    expect(responseResult.exitCode).toBe(0);

    const responsePath = path.join(contextRoot, "approvals", `${sessionId}.schema-change.${timestampSlug(responseTimestamp)}.response.md`);
    expect(existsSync(responsePath)).toBe(true);
  } finally {
    rmSync(contextRoot, { recursive: true, force: true });
  }
});
