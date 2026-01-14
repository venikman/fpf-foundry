import { existsSync } from "fs";
import { CliError } from "../lib/errors.ts";
import { buildSkillIndex } from "../skill/skill-index.ts";

type CommandContext = {
  rootDir: string;
};

export async function runListAsync(
  ctx: CommandContext,
  argv: string[],
): Promise<{ exitCode: number; json: unknown; stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  parseArgs(argv);

  if (!existsSync(ctx.rootDir)) {
    throw new CliError("ROOT_NOT_FOUND", `Root not found: ${ctx.rootDir}`, 1);
  }

  const index = buildSkillIndex({ rootDir: ctx.rootDir });

  for (const skill of index.skills) {
    stdout.push(skill.invocation);
  }

  return {
    exitCode: 0,
    json: {
      ok: true,
      command: "list",
      root: ctx.rootDir,
      schema_version: index.schema_version,
      skills: index.skills,
      count: index.skills.length,
    },
    stdout,
    stderr,
  };
}

function parseArgs(argv: string[]): void {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      throw new CliError(
        "HELP",
        ["Usage: fpf list", "", "Outputs the canonical SkillSpec invocation tokens."].join("\n"),
        0,
      );
    }
    throw new CliError("UNKNOWN_ARG", `Unknown argument '${arg}'.`, 1);
  }
}
