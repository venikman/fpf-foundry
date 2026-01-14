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
  return mkdtempSync(path.join(os.tmpdir(), "fpf-cli-test-"));
}

test("fresh empty dir: init then check succeeds (json-only stdout)", () => {
  const root = mkTempDir();
  try {
    const init = runFpf(["init", "--root", root, "--json"]);
    expect(init.exitCode).toBe(0);
    expect(init.stderr).toBe("");
    const initJson = JSON.parse(init.stdout) as { ok: boolean; created: string[] };
    expect(initJson.ok).toBe(true);
    expect(initJson.created).toContain("design/skills/example/hello/skill.json");
    expect(existsSync(path.join(root, "design", "skills", "example", "hello", "skill.json"))).toBe(true);
    expect(existsSync(path.join(root, "design", "skills", "SKILL_INVENTORY.md"))).toBe(true);
    expect(initJson.created).toContain("design/skills/SKILL_INDEX.json");
    expect(existsSync(path.join(root, "design", "skills", "SKILL_INDEX.json"))).toBe(true);

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

test("quickstart creates a DRR and work log in a new root", () => {
  const parent = mkTempDir();
  const root = path.join(parent, "workspace");
  try {
    const fixedNow = "2026-01-01T00:00:00.000Z";
    const quickstart = runFpf(["quickstart", "--root", root, "--json"], { env: { FPF_FIXED_NOW: fixedNow } });
    expect(quickstart.exitCode).toBe(0);
    expect(quickstart.stderr).toBe("");
    const quickstartJson = JSON.parse(quickstart.stdout) as { ok: boolean; command: string; drrPath: string; created: string[] };
    expect(quickstartJson.ok).toBe(true);
    expect(quickstartJson.command).toBe("quickstart");
    expect(quickstartJson.drrPath).toBe("design/decisions/001-fpf-quickstart.md");

    const timestamp = fixedNow.replace(/[:.]/g, "-");
    const drrPath = path.join(root, "design", "decisions", "001-fpf-quickstart.md");
    const workPath = path.join(root, "runtime", "contexts", "Quickstart", "telemetry", "work", `work-${timestamp}.md`);
    expect(quickstartJson.created).toContain("design/decisions/001-fpf-quickstart.md");
    expect(existsSync(drrPath)).toBe(true);
    expect(existsSync(workPath)).toBe(true);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("domain commands: mint-name + record-drr write expected outputs", () => {
  const root = mkTempDir();
  try {
    expect(runFpf(["init", "--root", root, "--json"]).exitCode).toBe(0);

    const mint = runFpf(
      ["mint-name", "--root", root, "--context", "Demo", "--id", "example-name", "--label", "Example Name", "--mds", "A minimal definitional statement.", "--json"],
      { env: { FPF_FIXED_NOW: "2026-01-01T00:00:00.000Z" } },
    );
    expect(mint.exitCode).toBe(0);
    expect(mint.stderr).toBe("");
    const mintJson = JSON.parse(mint.stdout) as { ok: boolean; created: string[] };
    expect(mintJson.ok).toBe(true);
    expect(mintJson.created).toContain("runtime/contexts/Demo/design/names/example-name.md");
    expect(existsSync(path.join(root, "runtime", "contexts", "Demo", "design", "names", "example-name.md"))).toBe(true);

    const drr = runFpf(
      ["record-drr", "--root", root, "--title", "Harness Decision", "--context", "Need deterministic.", "--decision", "Add a release workflow.", "--work-context", "Demo", "--json"],
      { env: { FPF_FIXED_NOW: "2026-01-01T00:00:01.000Z" } },
    );
    expect(drr.exitCode).toBe(0);
    expect(drr.stderr).toBe("");
    const drrJson = JSON.parse(drr.stdout) as { ok: boolean; created: string[]; drrPath: string };
    expect(drrJson.ok).toBe(true);
    expect(drrJson.drrPath).toBe("design/decisions/001-harness-decision.md");
    expect(existsSync(path.join(root, "design", "decisions", "001-harness-decision.md"))).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
