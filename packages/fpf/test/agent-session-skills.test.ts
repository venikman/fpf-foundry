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

function workPath(context: string, timestamp: string): string {
  const normalized = timestamp.replace(/[:.]/g, "-");
  return path.join(repoRoot, "runtime", "contexts", context, "telemetry", "work", `work-${normalized}.md`);
}

test("agent session lifecycle skills create deterministic artifacts", () => {
  const context = "Harness";
  const sessionId = "session-001";
  const contextRoot = path.join(repoRoot, "runtime", "contexts", context);

  rmSync(contextRoot, { recursive: true, force: true });

  try {
    const startTimestamp = "2026-01-01T00:00:00.000Z";
    const startResult = runSkill("develop/skills/src/governance/start-agent-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--title",
      "Harness Session",
      "--purpose",
      "Validate deterministic session artifacts.",
      "--agent-type",
      "strategist",
      "--agent-model",
      "gpt-5.2-codex",
      "--timestamp-start",
      startTimestamp,
    ]);

    expect(startResult.exitCode).toBe(0);

    const sessionPath = path.join(contextRoot, "sessions", `${sessionId}.session.md`);
    expect(existsSync(sessionPath)).toBe(true);
    const sessionContent = readFileSync(sessionPath, "utf8");
    expect(sessionContent).toContain(`session_id: "${sessionId}"`);
    expect(sessionContent).toContain("status: \"active\"");

    const startWorkPath = workPath(context, startTimestamp);
    expect(existsSync(startWorkPath)).toBe(true);

    const duplicateStart = runSkill("develop/skills/src/governance/start-agent-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--title",
      "Duplicate",
      "--timestamp-start",
      "2026-01-01T00:00:00.500Z",
    ]);

    expect(duplicateStart.exitCode).not.toBe(0);

    const handoffTimestamp = "2026-01-01T00:00:01.000Z";
    const handoffResult = runSkill("develop/skills/src/governance/handoff-to-agent/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--to-agent-type",
      "executor",
      "--from-agent-type",
      "strategist",
      "--instructions",
      "Apply changes; run checks",
      "--timestamp-start",
      handoffTimestamp,
    ]);

    expect(handoffResult.exitCode).toBe(0);
    const handoffPath1 = path.join(contextRoot, "handoffs", `${sessionId}.executor.1.handoff.yaml`);
    expect(existsSync(handoffPath1)).toBe(true);
    const handoffContent1 = readFileSync(handoffPath1, "utf8");
    expect(handoffContent1).toContain(`handoff_id: "${sessionId}.executor.1"`);

    const handoffWorkPath = workPath(context, handoffTimestamp);
    expect(existsSync(handoffWorkPath)).toBe(true);

    const handoffTimestamp2 = "2026-01-01T00:00:02.000Z";
    const handoffResult2 = runSkill("develop/skills/src/governance/handoff-to-agent/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--to-agent-type",
      "executor",
      "--from-agent-type",
      "strategist",
      "--instructions",
      "Apply changes; run checks",
      "--timestamp-start",
      handoffTimestamp2,
    ]);

    expect(handoffResult2.exitCode).toBe(0);
    const handoffPath2 = path.join(contextRoot, "handoffs", `${sessionId}.executor.2.handoff.yaml`);
    expect(existsSync(handoffPath2)).toBe(true);

    const completeTimestamp = "2026-01-01T00:00:03.000Z";
    const completeResult = runSkill("develop/skills/src/governance/complete-agent-session/index.ts", [
      "--context",
      context,
      "--session-id",
      sessionId,
      "--status",
      "needs-review",
      "--summary",
      "Awaiting human verification.",
      "--agent-type",
      "strategist",
      "--timestamp-start",
      completeTimestamp,
    ]);

    expect(completeResult.exitCode).toBe(0);
    const completedContent = readFileSync(sessionPath, "utf8");
    expect(completedContent).toContain("status: \"completed\"");
    expect(completedContent).toContain("outcome: \"needs-review\"");
    expect(completedContent).toContain(`completed_at: "${completeTimestamp}"`);

    const completeWorkPath = workPath(context, completeTimestamp);
    expect(existsSync(completeWorkPath)).toBe(true);
  } finally {
    rmSync(contextRoot, { recursive: true, force: true });
  }
});
