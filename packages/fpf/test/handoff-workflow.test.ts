import { expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
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

test("generate-handoff then parse-handoff round-trips to canonical JSON", () => {
  const context = "Harness";
  const sessionId = "session-rt";
  const contextRoot = path.join(repoRoot, "runtime", "contexts", context);

  rmSync(contextRoot, { recursive: true, force: true });

  try {
    const issuedAt = "2026-01-01T00:00:00.000Z";
    const generateResult = runSkill("develop/skills/src/workflow/generate-handoff/index.ts", [
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
      "--acceptance-criteria",
      "Tests pass; No lint errors",
      "--constraints",
      "No schema changes",
      "--prohibited-actions",
      "Do not run destructive commands",
      "--artifacts",
      "design/skills/telemetry/log-work/skill.json",
      "--notes",
      "Round-trip fixture",
      "--timestamp-start",
      issuedAt,
    ]);

    expect(generateResult.exitCode).toBe(0);

    const handoffPath = path.join(contextRoot, "handoffs", `${sessionId}.executor.1.handoff.yaml`);
    expect(existsSync(handoffPath)).toBe(true);

    const parseResult = runSkill("develop/skills/src/workflow/parse-handoff/index.ts", [
      "--handoff-path",
      handoffPath,
    ]);

    expect(parseResult.exitCode).toBe(0);

    const parsedPath = path.join(contextRoot, "handoffs", `${sessionId}.executor.1.parsed.json`);
    expect(existsSync(parsedPath)).toBe(true);

    const parsed = JSON.parse(readFileSync(parsedPath, "utf8")) as Record<string, unknown>;
    expect(parsed).toEqual({
      schema_version: "0.1.0",
      type: "U.AgentHandoff",
      version: "0.1.0",
      context,
      session_id: sessionId,
      handoff_id: `${sessionId}.executor.1`,
      from_agent_type: "strategist",
      to_agent_type: "executor",
      issued_at: issuedAt,
      instructions: ["Apply changes", "run checks"],
      acceptance_criteria: ["Tests pass", "No lint errors"],
      constraints: ["No schema changes"],
      prohibited_actions: ["Do not run destructive commands"],
      artifacts: ["design/skills/telemetry/log-work/skill.json"],
      notes: "Round-trip fixture",
    });
  } finally {
    rmSync(contextRoot, { recursive: true, force: true });
  }
});

test("parse-handoff rejects missing required fields", () => {
  const context = "Harness";
  const contextRoot = path.join(repoRoot, "runtime", "contexts", context, "handoffs");
  rmSync(path.join(repoRoot, "runtime", "contexts", context), { recursive: true, force: true });

  try {
    mkdirSync(contextRoot, { recursive: true });
    const pathMissing = path.join(contextRoot, "missing-fields.handoff.yaml");
    writeFileSync(
      pathMissing,
      [
        "schema_version: \"0.1.0\"",
        "type: U.AgentHandoff",
        "version: \"0.1.0\"",
        "context: Harness",
        "session_id: session-missing",
        "handoff_id: session-missing.executor.1",
        "from_agent_type: strategist",
        "issued_at: 2026-01-01T00:00:00Z",
        "instructions: []",
        "acceptance_criteria: []",
        "constraints: []",
        "artifacts: []",
      ].join("\n"),
      "utf8",
    );

    const result = runSkill("develop/skills/src/workflow/parse-handoff/index.ts", ["--handoff-path", pathMissing]);
    expect(result.exitCode).not.toBe(0);
  } finally {
    rmSync(path.join(repoRoot, "runtime", "contexts", context), { recursive: true, force: true });
  }
});

test("parse-handoff rejects invalid agent type and malformed prohibited_actions", () => {
  const context = "Harness";
  const contextRoot = path.join(repoRoot, "runtime", "contexts", context, "handoffs");
  rmSync(path.join(repoRoot, "runtime", "contexts", context), { recursive: true, force: true });

  try {
    mkdirSync(contextRoot, { recursive: true });
    const invalidAgentPath = path.join(contextRoot, "invalid-agent.handoff.yaml");
    writeFileSync(
      invalidAgentPath,
      [
        "schema_version: \"0.1.0\"",
        "type: U.AgentHandoff",
        "version: \"0.1.0\"",
        "context: Harness",
        "session_id: session-invalid",
        "handoff_id: session-invalid.executor.1",
        "from_agent_type: strategist",
        "to_agent_type: unknown",
        "issued_at: 2026-01-01T00:00:00Z",
        "instructions:",
        "  - Do the thing",
        "acceptance_criteria: []",
        "constraints:",
        "  - Stay within scope",
        "prohibited_actions:",
        "  - Avoid destructive commands",
        "artifacts: []",
      ].join("\n"),
      "utf8",
    );

    const invalidAgentResult = runSkill("develop/skills/src/workflow/parse-handoff/index.ts", ["--handoff-path", invalidAgentPath]);
    expect(invalidAgentResult.exitCode).not.toBe(0);

    const malformedPath = path.join(contextRoot, "malformed-actions.handoff.yaml");
    writeFileSync(
      malformedPath,
      [
        "schema_version: \"0.1.0\"",
        "type: U.AgentHandoff",
        "version: \"0.1.0\"",
        "context: Harness",
        "session_id: session-invalid",
        "handoff_id: session-invalid.executor.2",
        "from_agent_type: strategist",
        "to_agent_type: executor",
        "issued_at: 2026-01-01T00:00:00Z",
        "instructions:",
        "  - Do the thing",
        "acceptance_criteria: []",
        "constraints:",
        "  - Stay within scope",
        "prohibited_actions: Do not do this",
        "artifacts: []",
      ].join("\n"),
      "utf8",
    );

    const malformedResult = runSkill("develop/skills/src/workflow/parse-handoff/index.ts", ["--handoff-path", malformedPath]);
    expect(malformedResult.exitCode).not.toBe(0);
  } finally {
    rmSync(path.join(repoRoot, "runtime", "contexts", context), { recursive: true, force: true });
  }
});
