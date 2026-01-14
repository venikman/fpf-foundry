import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
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
  return mkdtempSync(path.join(os.tmpdir(), "fpf-compat-test-"));
}

function listFixtureFiles(rootDir: string): string[] {
  const results: string[] = [];
  walk(rootDir, results);
  return results.filter((filePath) => filePath.endsWith(".json"));

  function walk(dir: string, list: string[]): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, list);
      } else if (entry.isFile()) {
        list.push(fullPath);
      }
    }
  }
}

test("skillspec compatibility fixtures pass fpf check", () => {
  const root = mkTempDir();
  try {
    const fixtureRoot = path.join(process.cwd(), "design", "examples", "skills", "compat", "v0.1.0");
    const fixtureFiles = listFixtureFiles(fixtureRoot);
    expect(fixtureFiles.length).toBeGreaterThan(0);

    for (const fixturePath of fixtureFiles) {
      const content = readFileSync(fixturePath, "utf8");
      const parsed = JSON.parse(content) as { id?: string };
      const id = typeof parsed.id === "string" ? parsed.id.trim() : "";
      expect(id.length).toBeGreaterThan(0);

      const targetPath = path.join(root, "design", "skills", ...id.split("/"), "skill.json");
      mkdirSync(path.dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, content, "utf8");
    }

    const result = runFpf(["check", "--root", root, "--fix", "--json"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const json = JSON.parse(result.stdout) as { ok: boolean; issues: unknown[] };
    expect(json.ok).toBe(true);
    expect(json.issues).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("skillspec validation rejects invalid schema_version", () => {
  const root = mkTempDir();
  try {
    const invalidSpec = {
      schema_version: "0.0.0",
      id: "compat/invalid",
      name: "Compat Invalid",
      summary: "Invalid schema version fixture.",
      conformance: {
        checklist: ["inputs_validated", "outputs_listed", "u_work_emitted", "deterministic_naming", "inventory_updated"],
      },
      intent: {
        goal: "Prove schema validation fails on mismatched schema_version.",
        non_goals: [],
      },
      inputs: [],
      outputs: [],
      procedure: [
        {
          step_id: "step-1",
          instruction: "Do nothing.",
        },
      ],
      constraints: {
        safety: [],
        privacy: [],
        licensing: [],
      },
      dependencies: {
        tools: [],
        skills: [],
      },
      eval: {
        acceptance_criteria: ["Validation fails."],
        tests: [
          {
            name: "invalid-schema-version",
            input_fixture: {},
            expected: {},
          },
        ],
      },
      version: "0.1.0",
      metadata: {
        tags: ["compat"],
        authors: ["FPF Foundry"],
        created: "2026-01-01",
        updated: "2026-01-01",
      },
    };

    const targetPath = path.join(root, "design", "skills", "compat", "invalid", "skill.json");
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, `${JSON.stringify(invalidSpec, null, 2)}\n`, "utf8");

    const result = runFpf(["check", "--root", root, "--fix", "--json"]);
    expect(result.exitCode).toBe(2);
    const json = JSON.parse(result.stdout) as { ok: boolean; issues: Array<{ check: string }> };
    expect(json.ok).toBe(false);
    expect(json.issues.some((issue) => issue.check === "skillspec")).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
