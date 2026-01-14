import { accessSync, constants, existsSync, statSync } from "fs";
import * as os from "os";
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

  const report = {
    ok: true,
    command: "doctor",
    root,
    platform: process.platform,
    arch: process.arch,
    bunVersion: Bun.version,
    osRelease: os.release(),
    exists,
    isDirectory,
    writable,
    lineEndingsRisk: process.platform === "win32" ? "high" : "low",
  };

  stdout.push(`Root: ${root}`);
  stdout.push(`Platform: ${report.platform} (${report.arch}), Bun ${report.bunVersion}`);
  stdout.push(`Exists: ${exists}, Directory: ${isDirectory}, Writable: ${writable}`);
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

