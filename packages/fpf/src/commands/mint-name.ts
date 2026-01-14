import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { CliError } from "../lib/errors.ts";
import { logWorkAsync } from "./log-work.ts";

type CommandContext = {
  rootDir: string;
};

export async function runMintNameAsync(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const options = parseArgs(argv);

  if (!existsSync(ctx.rootDir)) {
    throw new CliError("ROOT_NOT_FOUND", `Root not found: ${ctx.rootDir}`, 1);
  }

  const targetDir = join(ctx.rootDir, "runtime", "contexts", options.context, "design", "names");
  mkdirSync(targetDir, { recursive: true });

  const relNameCardPath = `runtime/contexts/${options.context}/design/names/${options.id}.md`;
  const absNameCardPath = join(ctx.rootDir, relNameCardPath);

  if (existsSync(absNameCardPath) && !options.force) {
    throw new CliError("ALREADY_EXISTS", `Name Card already exists at ${relNameCardPath}`, 1);
  }

  const content = `---
type: F.18 Name Card
id: ${options.id}
label: ${options.label}
context: ${options.context}
status: experimental
---

# F.18 Name Card: ${options.label}

## 1. Twin-Labels
- **Technical ID**: \`${options.id}\`
- **Plain-English**: "${options.label}"

## 2. Minimal Definitional Statement (MDS)
> ${options.mds}

## 3. Context of Meaning
Defined within the **${options.context}** Bounded Context.

## 4. Sense-Seed Validation (Self-Check)
- [x] **S1 Add**: "Add a new ${options.label}..."
- [x] **S2 Retrieve**: "Get a ${options.label} from..."
- [x] **WP Zero**: No prototypes violated.

## 5. Rationale
Minted via \`design/mint-name\`.
`;

  mkdirSync(dirname(absNameCardPath), { recursive: true });
  writeFileSync(absNameCardPath, content, "utf8");

  const created: string[] = [relNameCardPath];
  const warnings: Array<{ code: string; message: string }> = [];

  if (!options.noWorkLog) {
    try {
      const work = await logWorkAsync({
        rootDir: ctx.rootDir,
        input: {
          method: "design/mint-name",
          roleAssignment: "Archivist",
          context: options.context,
          action: `Minted Name Card '${options.label}' (${options.id})`,
          outputs: [relNameCardPath],
          decisions: [],
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
    json: {
      ok: true,
      command: "mint-name",
      root: ctx.rootDir,
      nameCardPath: relNameCardPath,
      created: created.sort(),
      warnings,
    },
    stdout: [`Success: Created ${relNameCardPath}`],
    stderr: warnings.map((w) => `WARN: ${w.message}`),
  };
}

type MintNameOptions = {
  context: string;
  id: string;
  label: string;
  mds: string;
  noWorkLog: boolean;
  force: boolean;
};

function parseArgs(argv: string[]): MintNameOptions {
  let context = "";
  let id = "";
  let label = "";
  let mds = "";
  let noWorkLog = false;
  let force = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      throw new CliError(
        "HELP",
        [
          "Usage: fpf mint-name --context <ctx> --id <kebab-id> --label <Title Case> --mds <definition> [options]",
          "",
          "Options:",
          "  --context <ctx>      Bounded context (safe path segment)",
          "  --id <kebab-id>      Technical ID (kebab-case)",
          "  --label <label>      Plain-English label",
          "  --mds <text>         Minimal definitional statement",
          "  --no-work-log        Skip automatic telemetry/log-work",
          "  --force              Overwrite existing Name Card",
        ].join("\n"),
        0,
      );
    }
    if (arg === "--no-work-log") {
      noWorkLog = true;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--context") {
      context = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--id") {
      id = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--label") {
      label = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--mds") {
      mds = requireArgValue(argv, i, arg);
      i += 1;
      continue;
    }
    throw new CliError("UNKNOWN_ARG", `Unknown argument '${arg}'.`, 1);
  }

  const contextValue = requireMatch(context, /^[A-Za-z0-9][A-Za-z0-9_-]*$/, "context", "a safe path segment (letters, digits, '_' or '-')");
  const idValue = requireMatch(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id", "kebab-case (lowercase letters, digits, '-')");
  const labelValue = requireNonEmpty(label, "label");
  const mdsValue = requireNonEmpty(mds, "mds");

  return { context: contextValue, id: idValue, label: labelValue, mds: mdsValue, noWorkLog, force };
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

function requireMatch(value: string | undefined, pattern: RegExp, name: string, description: string): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0 || !pattern.test(trimmed)) {
    throw new CliError("INVALID_ARG", `Invalid ${name} '${value ?? ""}'. Expected ${description}.`, 1);
  }
  return trimmed;
}

