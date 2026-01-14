import { resolve } from "path";
import pkg from "../package.json";
import { CliError } from "./lib/errors.ts";
import { writeJsonLine, writeLines } from "./lib/output.ts";
import { runCheckAsync } from "./commands/check.ts";
import { runDoctorAsync } from "./commands/doctor.ts";
import { runInitAsync } from "./commands/init.ts";
import { runLogWorkAsync } from "./commands/log-work.ts";
import { runMintNameAsync } from "./commands/mint-name.ts";
import { runRecordDrrAsync } from "./commands/record-drr.ts";

type GlobalOptions = {
  json: boolean;
  rootArg: string;
  rootDir: string;
  help: boolean;
  version: boolean;
  command: string | null;
  commandArgs: string[];
};

export async function runCliAsync(argv: string[]): Promise<number> {
  const jsonRequested = argv.includes("--json");
  let parsed: GlobalOptions;
  try {
    parsed = parseGlobalOptions(argv);
  } catch (error) {
    const failure = normalizeError(error);
    if (jsonRequested) {
      writeJsonLine({ ok: false, command: "parse", root: resolve(process.cwd()), error: { code: failure.code, message: failure.message } });
      return failure.exitCode;
    }
    writeLines(process.stderr, [failure.message]);
    return failure.exitCode;
  }

  try {
    if (parsed.version) {
      return writeVersion(parsed.json);
    }

    if (!parsed.command || parsed.help) {
      return writeHelp(parsed.json, parsed.command);
    }

    if (parsed.command === "init") {
      const result = await runInitAsync({ rootDir: parsed.rootDir }, parsed.commandArgs);
      return flushResult(parsed.json, result);
    }
    if (parsed.command === "check") {
      const result = await runCheckAsync({ rootDir: parsed.rootDir }, parsed.commandArgs);
      return flushResult(parsed.json, result);
    }
    if (parsed.command === "doctor") {
      const result = await runDoctorAsync({ rootDir: parsed.rootDir }, parsed.commandArgs);
      return flushResult(parsed.json, result);
    }
    if (parsed.command === "mint-name") {
      const result = await runMintNameAsync({ rootDir: parsed.rootDir }, parsed.commandArgs);
      return flushResult(parsed.json, result);
    }
    if (parsed.command === "record-drr") {
      const result = await runRecordDrrAsync({ rootDir: parsed.rootDir }, parsed.commandArgs);
      return flushResult(parsed.json, result);
    }
    if (parsed.command === "log-work") {
      const result = await runLogWorkAsync({ rootDir: parsed.rootDir }, parsed.commandArgs);
      return flushResult(parsed.json, result);
    }

    throw new CliError("UNKNOWN_COMMAND", `Unknown command '${parsed.command}'.`, 1);
  } catch (error) {
    const failure = normalizeError(error);
    if (failure.exitCode === 0 && failure.code === "HELP") {
      if (parsed.json) {
        writeJsonLine({ ok: true, command: "help", topic: parsed.command ?? "global", usage: failure.message });
        return 0;
      }
      writeLines(process.stdout, [failure.message]);
      return 0;
    }
    if (parsed.json) {
      writeJsonLine({
        ok: false,
        command: parsed.command ?? "unknown",
        root: parsed.rootDir,
        error: { code: failure.code, message: failure.message, ...(failure.details ? { details: failure.details } : {}) },
      });
      return failure.exitCode;
    }
    writeLines(process.stderr, [failure.message]);
    return failure.exitCode;
  }
}

function flushResult(json: boolean, result: { exitCode: number; json: unknown; stdout: string[]; stderr: string[] }): number {
  if (json) {
    writeJsonLine(result.json);
    return result.exitCode;
  }
  writeLines(process.stdout, result.stdout);
  writeLines(process.stderr, result.stderr);
  return result.exitCode;
}

function parseGlobalOptions(argv: string[]): GlobalOptions {
  let json = false;
  let rootArg = process.cwd();
  let help = false;
  let version = false;

  let command: string | null = null;
  const commandArgs: string[] = [];
  const leftovers: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      if (!command) {
        command = argv[i + 1] ?? null;
        commandArgs.push(...argv.slice(i + 2));
      } else {
        commandArgs.push(...argv.slice(i + 1));
      }
      break;
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg === "--root") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        throw new CliError("MISSING_ARG", "Missing value for --root.", 1);
      }
      rootArg = value;
      i += 1;
      continue;
    }
    if (arg.startsWith("--root=")) {
      rootArg = arg.slice("--root=".length);
      continue;
    }

    const isHelp = arg === "-h" || arg === "--help";
    const isVersion = arg === "-v" || arg === "-V" || arg === "--version";
    if (isHelp) {
      if (!command) {
        help = true;
      } else {
        commandArgs.push(arg);
      }
      continue;
    }
    if (isVersion) {
      if (!command) {
        version = true;
      } else {
        commandArgs.push(arg);
      }
      continue;
    }

    if (!command && !arg.startsWith("-")) {
      command = arg;
      continue;
    }

    if (!command) {
      leftovers.push(arg);
      continue;
    }

    commandArgs.push(arg);
  }

  if (!command && leftovers.length > 0) {
    command = leftovers[0] ?? null;
    commandArgs.push(...leftovers.slice(1));
  }

  return { json, rootArg, rootDir: resolve(rootArg), help, version, command, commandArgs };
}

function writeHelp(json: boolean, command: string | null): number {
  const usage = [
    "Usage: fpf [--root <dir>] [--json] <command> [args]",
    "",
    "Commands:",
    "  init",
    "  check",
    "  doctor",
    "  mint-name",
    "  record-drr",
    "  log-work",
    "",
    "Global options:",
    "  --root <dir>   Target root directory (default: cwd)",
    "  --json         Machine-readable JSON output",
    "  -h, --help     Show help",
    "  -v, --version  Show version",
  ].join("\n");

  if (json) {
    writeJsonLine({ ok: true, command: "help", topic: command ?? "global", usage });
    return 0;
  }

  if (command && command !== "help") {
    writeLines(process.stdout, [`Unknown or unimplemented command '${command}'.`, ""]);
  }
  writeLines(process.stdout, [usage]);
  return 0;
}

function writeVersion(json: boolean): number {
  const versionValue = typeof pkg.version === "string" ? pkg.version : "0.0.0";
  if (json) {
    writeJsonLine({ ok: true, command: "version", version: versionValue });
    return 0;
  }
  writeLines(process.stdout, [versionValue]);
  return 0;
}

function normalizeError(error: unknown): { code: string; message: string; exitCode: number; details?: unknown } {
  if (error instanceof CliError) {
    return { code: error.code, message: error.message, exitCode: error.exitCode, details: error.details };
  }
  if (error instanceof Error) {
    return { code: "UNHANDLED", message: error.message, exitCode: 3 };
  }
  return { code: "UNHANDLED", message: String(error), exitCode: 3 };
}
