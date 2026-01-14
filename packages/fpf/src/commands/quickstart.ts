import { accessSync, constants, existsSync, mkdirSync, statSync } from "fs";
import { CliError } from "../lib/errors.ts";
import { runRecordDrrAsync } from "./record-drr.ts";

type CommandContext = {
  rootDir: string;
};

type QuickstartOptions = {
  title: string;
  context: string;
  decision: string;
  workContext: string;
  noWorkLog: boolean;
};

const defaultOptions: QuickstartOptions = {
  title: "FPF Quickstart",
  context: "Prove fpf can write a DRR and work log with zero setup.",
  decision: "Record a starter DRR and work log for the first run.",
  workContext: "Quickstart",
  noWorkLog: false,
};

export async function runQuickstartAsync(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const options = parseArgs(argv);
  const root = ctx.rootDir;

  if (!existsSync(root)) {
    mkdirSync(root, { recursive: true });
    stdout.push(`Created root: ${root}`);
  }

  if (!safeIsDirectory(root)) {
    throw new CliError("ROOT_NOT_DIRECTORY", `Root is not a directory: ${root}`, 1);
  }

  if (!safeIsWritable(root)) {
    throw new CliError("ROOT_NOT_WRITABLE", `Root is not writable: ${root}`, 1);
  }

  const recordArgs = [
    "--title",
    options.title,
    "--context",
    options.context,
    "--decision",
    options.decision,
    "--work-context",
    options.workContext,
  ];
  if (options.noWorkLog) {
    recordArgs.push("--no-work-log");
  }

  const result = await runRecordDrrAsync({ rootDir: root }, recordArgs);
  return {
    exitCode: result.exitCode,
    json: withCommandOverride(result.json, "quickstart"),
    stdout: [...stdout, ...result.stdout],
    stderr: result.stderr,
  };
}

function parseArgs(argv: string[]): QuickstartOptions {
  const options: QuickstartOptions = { ...defaultOptions };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      throw new CliError(
        "HELP",
        [
          "Usage: fpf quickstart [options]",
          "",
          "Options:",
          "  --title <text>         DRR title (default: FPF Quickstart)",
          "  --context <text>       DRR context (default: generated)",
          "  --decision <text>      DRR decision (default: generated)",
          "  --work-context <ctx>   Work log context (default: Quickstart)",
          "  --no-work-log          Skip automatic telemetry/log-work",
        ].join("\n"),
        0,
      );
    }
    if (arg === "--no-work-log") {
      options.noWorkLog = true;
      continue;
    }
    if (arg === "--title") {
      options.title = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--context") {
      options.context = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--decision") {
      options.decision = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--work-context") {
      options.workContext = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    throw new CliError("UNKNOWN_ARG", `Unknown argument '${arg}'.`, 1);
  }

  return {
    title: requireNonEmpty(options.title, "title"),
    context: requireNonEmpty(options.context, "context"),
    decision: requireNonEmpty(options.decision, "decision"),
    workContext: requireNonEmpty(options.workContext, "work-context"),
    noWorkLog: options.noWorkLog,
  };
}

function requireArgValue(argv: string[], index: number, name: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    throw new CliError("MISSING_ARG", `Missing value for ${name}.`, 1);
  }
  return value;
}

function requireNonEmpty(value: string | undefined, name: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    throw new CliError("MISSING_ARG", `Missing ${name}.`, 1);
  }
  return trimmed;
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

function withCommandOverride(json: unknown, command: string): unknown {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return json;
  }
  return { ...(json as Record<string, unknown>), command };
}
