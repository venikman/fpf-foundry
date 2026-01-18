#!/usr/bin/env bun
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";

type Block = {
  file: string;
  startLine: number;
  lang: string;
  content: string;
};

type Options = {
  keepSandbox: boolean;
  files: string[];
};

const repoRoot = process.cwd();
const options = parseArgs(process.argv.slice(2));

const sandboxRoot = mkdtempSync(path.join(os.tmpdir(), "fpf-readme-"));
const sandboxRepo = path.join(sandboxRoot, "repo");
const sandboxHome = path.join(sandboxRoot, "home");
const codexHome = path.join(sandboxHome, ".codex");

try {
  copyRepo(repoRoot, sandboxRepo);
  mkdirSync(sandboxHome, { recursive: true });
  mkdirSync(codexHome, { recursive: true });
  initGitRepo(sandboxRepo);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: sandboxHome,
    CODEX_HOME: codexHome,
    FPF_REPO: sandboxRepo,
  };

  const fpfBin = path.join(sandboxRepo, "packages", "fpf", "bin", "fpf");
  const blocks = options.files.flatMap((file) => extractBlocks(file));

  if (blocks.length === 0) {
    console.log("No README shell examples found.");
    process.exit(0);
  }

  for (const block of blocks) {
    const normalized = normalizeBlock(block.content, sandboxRepo, fpfBin);
    runBlock(block, normalized, sandboxRepo, env);
  }
} finally {
  if (options.keepSandbox) {
    console.log(`Keeping sandbox: ${sandboxRepo}`);
  } else {
    rmSync(sandboxRoot, { recursive: true, force: true });
  }
}

function parseArgs(argv: string[]): Options {
  const files: string[] = ["README.md", path.join("packages", "fpf", "README.md")];
  let keepSandbox = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      console.log(["Usage: bun develop/scripts/readme_examples_check.ts [options] [files...]", "", "Options:", "  --keep-sandbox  Keep the temp repo for inspection"].join("\n"));
      process.exit(0);
    }
    if (arg === "--keep-sandbox") {
      keepSandbox = true;
      continue;
    }
    files.push(arg);
  }

  return { keepSandbox, files };
}

function extractBlocks(file: string): Block[] {
  const filePath = path.resolve(repoRoot, file);
  const text = readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("```")) continue;
    const lang = line.slice(3).trim();
    if (lang !== "sh" && lang !== "bash") continue;
    const startLine = i + 1;
    const contentLines: string[] = [];
    i += 1;
    while (i < lines.length && !lines[i].startsWith("```")) {
      contentLines.push(lines[i]);
      i += 1;
    }
    blocks.push({
      file,
      startLine,
      lang,
      content: contentLines.join("\n"),
    });
  }

  return blocks;
}

function normalizeBlock(content: string, repoPath: string, fpfBin: string): string {
  let normalized = content.replaceAll("/path/to/fpf-foundry", repoPath);

  const localFpf = `bun "${fpfBin}"`;
  normalized = normalized.replace(/bunx\s+--bun\s+@venikman\/fpf(?:@[^\s]+)?/g, localFpf);
  normalized = normalized.replace(/bunx\s+--bun\s+"@venikman\/fpf[^"]*"/g, localFpf);

  const lines = normalized.split("\n").map((line) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("git diff --cached") && !trimmed.includes("||")) {
      return `${line} || true`;
    }
    return line;
  });

  return lines.join("\n");
}

function runBlock(block: Block, content: string, cwd: string, env: NodeJS.ProcessEnv): void {
  const script = `set -euo pipefail\n${content}`;
  const result = spawnSync("bash", ["-lc", script], { cwd, env, encoding: "utf8" });
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    console.error(`[${block.file}:${block.startLine}] failed to run block: ${message}`);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`[${block.file}:${block.startLine}] terminated by signal ${result.signal}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[${block.file}:${block.startLine}] README example failed`);
    if (result.stdout?.trim().length) {
      console.error(result.stdout.trimEnd());
    }
    if (result.stderr?.trim().length) {
      console.error(result.stderr.trimEnd());
    }
    process.exit(result.status ?? 1);
  }
}

function initGitRepo(root: string): void {
  runOrExit("git", ["init"], root);
  runOrExit("git", ["config", "user.email", "readme@local"], root);
  runOrExit("git", ["config", "user.name", "Readme"], root);
}

function copyRepo(src: string, dest: string): void {
  const excludePrefixes = [".git", "node_modules", ".bun", "dist", "coverage", "runtime/out", "runtime/contexts"];
  const excludeExact = new Set(["runtime/skills/index.json"]);

  mkdirSync(dest, { recursive: true });

  cpSync(src, dest, {
    recursive: true,
    dereference: true,
    filter: (sourcePath) => {
      const rel = path.relative(src, sourcePath);
      if (!rel || rel.length === 0) {
        return true;
      }
      const relPosix = rel.split(path.sep).join("/");
      if (excludeExact.has(relPosix)) {
        return false;
      }
      for (const prefix of excludePrefixes) {
        if (relPosix === prefix || relPosix.startsWith(`${prefix}/`)) {
          return false;
        }
      }
      return true;
    },
  });
}

function runOrExit(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    console.error(`Command failed: ${command}\n${message}`);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`Command terminated by signal ${result.signal}: ${command}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Command failed (${result.status}): ${command} ${args.join(" ")}`);
    if (result.stdout?.trim().length) {
      console.error(result.stdout.trimEnd());
    }
    if (result.stderr?.trim().length) {
      console.error(result.stderr.trimEnd());
    }
    process.exit(result.status ?? 1);
  }
}
