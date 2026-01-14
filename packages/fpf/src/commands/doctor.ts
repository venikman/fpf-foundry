import { accessSync, constants, existsSync, statSync } from "fs";
import * as os from "os";
import { dirname, join } from "path";
import { CliError } from "../lib/errors.ts";
import { runCheckAsync } from "./check.ts";

type CommandContext = {
  rootDir: string;
};

export async function runDoctorAsync(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const options = parseArgs(argv);

  const root = ctx.rootDir;
  const exists = existsSync(root);
  const isDirectory = exists ? safeIsDirectory(root) : false;
  const writable = exists ? safeIsWritable(root) : false;
  const rootParentWritable = !exists ? safeIsCreatable(root) : false;
  const targetsSkipped = !exists || !isDirectory;
  const targets = targetsSkipped ? [] : buildTargetReports(root);
  const targetsOk = targetsSkipped ? (exists ? isDirectory && writable : rootParentWritable) : targets.every((target) => target.ok);
  const bunOk = typeof Bun.version === "string" && Bun.version.trim().length > 0;

  const report = {
    ok: bunOk && (exists ? isDirectory && writable : rootParentWritable) && targetsOk,
    command: "doctor",
    root,
    platform: process.platform,
    arch: process.arch,
    bunVersion: Bun.version,
    osRelease: os.release(),
    exists,
    isDirectory,
    writable,
    rootParentWritable,
    targetsSkipped,
    targets,
    lineEndingsRisk: process.platform === "win32" ? "high" : "low",
  };

  stdout.push(`Root: ${root}`);
  stdout.push(`Platform: ${report.platform} (${report.arch}), Bun ${report.bunVersion}`);
  stdout.push(
    `Exists: ${exists}, Directory: ${isDirectory}, Writable: ${writable}${exists ? "" : `, Parent writable: ${rootParentWritable}`}`,
  );
  if (targetsSkipped) {
    stdout.push("Target paths: skipped (root missing or not a directory).");
  } else {
    stdout.push("Target paths:");
    for (const target of targets) {
      const parts = [`exists=${target.exists}`, `dir=${target.isDirectory}`, `writable=${target.writable}`];
      if (!target.exists) {
        parts.push(`parentWritable=${target.parentWritable}`);
      }
      stdout.push(`- ${target.path}: ${parts.join(", ")}`);
    }
  }
  stdout.push(`Line endings risk: ${report.lineEndingsRisk}`);

  if (!options.check) {
    return { exitCode: 0, json: report, stdout, stderr };
  }

  const checkResult = await runCheckAsync({ rootDir: root }, []);
  if (checkResult.exitCode !== 0) {
    return {
      exitCode: checkResult.exitCode,
      json: { ...report, ok: false, check: checkResult.json },
      stdout,
      stderr: [...stderr, ...checkResult.stderr],
    };
  }

  return {
    exitCode: 0,
    json: { ...report, check: checkResult.json },
    stdout: [...stdout, ...checkResult.stdout],
    stderr,
  };
}

type DoctorOptions = {
  check: boolean;
};

function parseArgs(argv: string[]): DoctorOptions {
  let check = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") {
      check = true;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      throw new CliError(
        "HELP",
        ["Usage: fpf doctor [--check]", "", "Options:", "  --check  Run `fpf check` after environment checks"].join("\n"),
        0,
      );
    }
    throw new CliError("UNKNOWN_ARG", `Unknown argument '${arg}'.`, 1);
  }

  return { check };
}

function safeIsDirectory(pathValue: string): boolean {
  try {
    return statSync(pathValue).isDirectory();
  } catch {
    return false;
  }
}

function safeIsWritable(pathValue: string): boolean {
  try {
    accessSync(pathValue, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function safeIsCreatable(pathValue: string): boolean {
  let current = dirname(pathValue);
  while (true) {
    if (existsSync(current)) {
      return safeIsDirectory(current) && safeIsWritable(current);
    }
    const next = dirname(current);
    if (next === current) {
      return false;
    }
    current = next;
  }
}

type TargetReport = {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  writable: boolean;
  parentWritable: boolean;
  ok: boolean;
};

function buildTargetReports(root: string): TargetReport[] {
  const targets = ["design/skills", "design/decisions", "runtime/contexts"];
  return targets.map((target) => {
    const absPath = join(root, ...target.split("/"));
    const exists = existsSync(absPath);
    const isDirectory = exists ? safeIsDirectory(absPath) : false;
    const writable = exists ? safeIsWritable(absPath) : false;
    const parentWritable = !exists ? safeIsCreatable(absPath) : false;
    const ok = exists ? isDirectory && writable : parentWritable;
    return { path: target, exists, isDirectory, writable, parentWritable, ok };
  });
}
