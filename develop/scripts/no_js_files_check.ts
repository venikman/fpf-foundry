#!/usr/bin/env bun
import { listStagedFiles, listTrackedFiles } from "./lib/git-utils";

const args = process.argv.slice(2);
const scanStaged = args.includes("--staged");
const scanAll = args.includes("--all") || !scanStaged;

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
