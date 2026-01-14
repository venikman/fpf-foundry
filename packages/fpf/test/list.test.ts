import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import * as os from "os";
import * as path from "path";

type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const decoder = new TextDecoder();
const fpfBin = path.join("packages", "fpf", "bin", "fpf");

function runFpf(args: string[]): RunResult {
  const proc = Bun.spawnSync({
    cmd: ["bun", fpfBin, ...args],
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });

  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout ? decoder.decode(proc.stdout) : "",
    stderr: proc.stderr ? decoder.decode(proc.stderr) : "",
  };
}

function mkTempDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "fpf-list-test-"));
}

test("list outputs invocation tokens and index metadata", () => {
  const root = mkTempDir();
  try {
    expect(runFpf(["init", "--root", root, "--json"]).exitCode).toBe(0);

    const list = runFpf(["list", "--root", root]);
    expect(list.exitCode).toBe(0);
    expect(list.stderr).toBe("");
    expect(list.stdout.split(/\r?\n/)).toContain("example/hello");

    const listJson = runFpf(["list", "--root", root, "--json"]);
    expect(listJson.exitCode).toBe(0);
    const payload = JSON.parse(listJson.stdout) as {
      ok: boolean;
      schema_version: string;
      skills: Array<{ id: string; invocation: string; package: string; spec_path: string; version: string }>;
    };
    expect(payload.ok).toBe(true);
    expect(payload.schema_version).toBe("1.0.0");
    const entry = payload.skills.find((skill) => skill.id === "example/hello");
    expect(entry).toBeDefined();
    expect(entry?.invocation).toBe("example/hello");
    expect(entry?.spec_path).toBe("design/skills/example/hello/skill.json");
    expect(entry?.package).toBe("@venikman/fpf-skill-example-hello");
    expect(entry?.version).toBe("0.1.0");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
