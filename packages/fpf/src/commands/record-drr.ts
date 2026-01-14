import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { CliError } from "../lib/errors.ts";
import { slugifyKebab } from "../lib/strings.ts";
import { resolveNow } from "../lib/time.ts";
import { logWorkAsync } from "./log-work.ts";

type CommandContext = {
  rootDir: string;
};

export async function runRecordDrrAsync(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const options = parseArgs(argv);

  if (!existsSync(ctx.rootDir)) {
    throw new CliError("ROOT_NOT_FOUND", `Root not found: ${ctx.rootDir}`, 1);
  }

  const targetDir = join(ctx.rootDir, "design", "decisions");
  mkdirSync(targetDir, { recursive: true });

  const files = readdirSync(targetDir).filter((f) => f.endsWith(".md"));
  let maxId = 0;
  for (const file of files) {
    const match = file.match(/^(\d+)-/);
    if (!match) continue;
    const value = Number.parseInt(match[1] ?? "0", 10);
    if (value > maxId) maxId = value;
  }
  const nextId = String(maxId + 1).padStart(3, "0");

  const kebabTitle = slugifyKebab(options.title);
  if (!kebabTitle) {
    throw new CliError("INVALID_ARG", "Title contains no usable characters for filename.", 1);
  }

  const filename = `${nextId}-${kebabTitle}.md`;
  const relDrrPath = `design/decisions/${filename}`;
  const absDrrPath = join(ctx.rootDir, relDrrPath);

  if (existsSync(absDrrPath)) {
    throw new CliError("ALREADY_EXISTS", `DRR already exists at ${relDrrPath}`, 1);
  }

  const dateStr = resolveNow().toISOString().split("T")[0];
  const content = `# ${nextId}. ${options.title}

## Status
**Proposed** on ${dateStr}

## Context
${options.context}

## Decision
${options.decision}

## Consequences
### Positive
- [ ] Explicit alignment with ...

### Negative
- [ ] Potential overhead from ...

## Compliance
- [ ] **E.9 DRR**: Follows standard format.
`;

  writeFileSync(absDrrPath, content, "utf8");

  const created: string[] = [relDrrPath];
  const warnings: Array<{ code: string; message: string }> = [];

  if (!options.noWorkLog) {
    try {
      const work = await logWorkAsync({
        rootDir: ctx.rootDir,
        input: {
          method: "design/record-drr",
          roleAssignment: "Archivist",
          context: options.workContext,
          action: `Recorded DRR '${options.title}' (${filename})`,
          outputs: [relDrrPath],
          decisions: [relDrrPath],
        },
        warnings,
        silent: true,
        stdout,
        stderr,
      });
      created.push(work.workRecordPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push({ code: "WORK_LOG_FAILED", message });
    }
  }

  return {
    exitCode: 0,
    json: { ok: true, command: "record-drr", root: ctx.rootDir, drrPath: relDrrPath, created: created.sort(), warnings },
    stdout: [`Success: Recorded ${relDrrPath}`],
    stderr: warnings.map((w) => `WARN: ${w.message}`),
  };
}

type RecordDrrOptions = {
  title: string;
  context: string;
  decision: string;
  workContext: string;
  noWorkLog: boolean;
};

function parseArgs(argv: string[]): RecordDrrOptions {
  let title = "";
  let context = "";
  let decision = "";
  let workContext = "Skills";
  let noWorkLog = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      throw new CliError(
        "HELP",
        [
          "Usage: fpf record-drr --title <title> --context <problem> --decision <solution> [options]",
          "",
          "Options:",
          "  --title <text>         DRR title",
          "  --context <text>       Problem context (free text)",
          "  --decision <text>      Decision statement (free text)",
          "  --work-context <ctx>   Work log context (default: Skills)",
          "  --no-work-log          Skip automatic telemetry/log-work",
        ].join("\n"),
        0,
      );
    }
    if (arg === "--no-work-log") {
      noWorkLog = true;
      continue;
    }
    if (arg === "--title") {
      title = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--context") {
      context = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--decision") {
      decision = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--work-context") {
      workContext = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    throw new CliError("UNKNOWN_ARG", `Unknown argument '${arg}'.`, 1);
  }

  return {
    title: requireNonEmpty(title, "title"),
    context: requireNonEmpty(context, "context"),
    decision: requireNonEmpty(decision, "decision"),
    workContext: requireNonEmpty(workContext, "work-context"),
    noWorkLog,
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

