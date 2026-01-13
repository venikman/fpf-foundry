#!/usr/bin/env bun
import { execFileSync } from "child_process";

const args = process.argv.slice(2);
const scanStaged = args.includes("--staged");
const scanAll = args.includes("--all") || !scanStaged;

const gitMaxBufferBytes = 64 * 1024 * 1024;

const fileList = scanStaged ? listStagedFiles() : scanAll ? listTrackedFiles() : [];
const jsFiles = fileList.filter((filePath) => filePath.endsWith(".js"));

if (jsFiles.length > 0) {
  console.error("JavaScript source files (*.js) are not allowed in this repo. Convert to TypeScript (*.ts).");
  for (const filePath of jsFiles) {
    console.error(`- ${filePath}`);
  }
  process.exit(1);
}

console.log(`No .js files found (${fileList.length} file(s) checked).`);

function listTrackedFiles(): string[] {
  return gitZ("ls-files").filter((entry) => entry.length > 0);
}

function listStagedFiles(): string[] {
  return gitZ("diff", "--cached", "--name-only", "--diff-filter=ACMR").filter((entry) => entry.length > 0);
}

function gitZ(...gitArgs: string[]): string[] {
  const buffer = execFileSync("git", [...gitArgs, "-z"], { encoding: null, maxBuffer: gitMaxBufferBytes });
  return buffer
    .toString("utf8")
    .split("\0")
    .filter((entry) => entry.length > 0);
}
