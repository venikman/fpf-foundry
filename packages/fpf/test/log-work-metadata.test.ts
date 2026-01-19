import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import * as os from "os";
import * as path from "path";

type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const decoder = new TextDecoder();
const fpfBin = path.join("packages", "fpf", "bin", "fpf");

function runFpf(args: string[], options?: { env?: NodeJS.ProcessEnv }): RunResult {
  const proc = Bun.spawnSync({
    cmd: ["bun", fpfBin, ...args],
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...(options?.env ?? {}) },
  });

  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout ? decoder.decode(proc.stdout) : "",
    stderr: proc.stderr ? decoder.decode(proc.stderr) : "",
  };
}

function mkTempDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "fpf-log-work-test-"));
}

test("log-work omits agent metadata when not provided", () => {
  const root = mkTempDir();
  try {
    const timestamp = "2026-01-01T00:00:00.000Z";
    const result = runFpf([
      "log-work",
      "--root",
      root,
      "--method",
      "telemetry/log-work",
      "--role-assignment",
      "Archivist",
      "--context",
      "Test",
      "--action",
      "Logged without agent metadata.",
      "--timestamp-start",
      timestamp,
      "--json",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const payload = JSON.parse(result.stdout) as { workRecordPath: string };
    const workPath = path.join(root, payload.workRecordPath);
    const content = readFileSync(workPath, "utf8");
    expect(content.includes("agent_metadata:")).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("log-work writes agent metadata when provided", () => {
  const root = mkTempDir();
  try {
    const timestamp = "2026-01-01T00:00:01.000Z";
    const result = runFpf([
      "log-work",
      "--root",
      root,
      "--method",
      "telemetry/log-work",
      "--role-assignment",
      "Archivist",
      "--context",
      "Test",
      "--action",
      "Logged with agent metadata.",
      "--timestamp-start",
      timestamp,
      "--agent-session",
      "session-123",
      "--agent-model",
      "gpt-5.2-codex",
      "--agent-type",
      "strategist",
      "--json",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const payload = JSON.parse(result.stdout) as { workRecordPath: string };
    const workPath = path.join(root, payload.workRecordPath);
    const content = readFileSync(workPath, "utf8");
    expect(content).toContain("agent_metadata:");
    expect(content).toContain('agent_session: "session-123"');
    expect(content).toContain('agent_model: "gpt-5.2-codex"');
    expect(content).toContain('agent_type: "strategist"');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
