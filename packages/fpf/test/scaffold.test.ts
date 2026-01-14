import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "fs";
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
  return mkdtempSync(path.join(os.tmpdir(), "fpf-scaffold-test-"));
}

test("scaffold skill writes fixtures and passes check", () => {
  const root = mkTempDir();
  try {
    const fixedNow = "2026-01-01T00:00:00.000Z";
    const scaffold = runFpf(
      [
        "scaffold",
        "skill",
        "--root",
        root,
        "--skill-id",
        "design/example-skill",
        "--name",
        "Example Skill",
        "--summary",
        "Example scaffolded skill.",
        "--json",
      ],
      { env: { FPF_FIXED_NOW: fixedNow } },
    );

    expect(scaffold.exitCode).toBe(0);
    expect(scaffold.stderr).toBe("");

    const payload = JSON.parse(scaffold.stdout) as {
      ok: boolean;
      skillId: string;
      created: string[];
      warnings: Array<{ code: string; message: string }>;
    };

    expect(payload.ok).toBe(true);
    expect(payload.skillId).toBe("design/example-skill");
    expect(payload.warnings).toEqual([]);

    expect(payload.created).toContain("design/skills/design/example-skill/skill.json");
    expect(payload.created).toContain("design/skills/design/example-skill/SKILL.md");
    expect(payload.created).toContain("develop/skills/src/design/example-skill/index.ts");
    expect(payload.created).toContain("develop/skills/src/design/example-skill/fixtures/input.json");
    expect(payload.created).toContain("develop/skills/src/design/example-skill/fixtures/expected.json");
    expect(payload.created).toContain("develop/skills/src/design/example-skill/index.test.ts");
    expect(payload.created).toContain("design/skills/SKILL_INVENTORY.md");
    expect(payload.created).toContain("design/skills/SKILL_INDEX.json");

    const timestamp = fixedNow.replace(/[:.]/g, "-");
    const workPath = `runtime/contexts/Skills/telemetry/work/work-${timestamp}.md`;
    expect(payload.created).toContain(workPath);

    expect(existsSync(path.join(root, "design", "skills", "design", "example-skill", "skill.json"))).toBe(true);
    expect(existsSync(path.join(root, "develop", "skills", "src", "design", "example-skill", "index.ts"))).toBe(true);
    expect(existsSync(path.join(root, "develop", "skills", "src", "design", "example-skill", "fixtures", "input.json"))).toBe(true);
    expect(existsSync(path.join(root, "develop", "skills", "src", "design", "example-skill", "index.test.ts"))).toBe(true);
    expect(existsSync(path.join(root, workPath))).toBe(true);

    const check = runFpf(["check", "--root", root, "--json"]);
    expect(check.exitCode).toBe(0);
    expect(check.stderr).toBe("");
    const checkJson = JSON.parse(check.stdout) as { ok: boolean; issues: unknown[] };
    expect(checkJson.ok).toBe(true);
    expect(checkJson.issues).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
