#!/usr/bin/env bun
import { resolve } from "path";
import { statSync } from "fs";
import { findSkillFiles, loadJsonFile, toRepoRelative } from "./lib/skill-io";
import { CrossCheckError, SkillDoc, validateSchema, runCrossChecks } from "./lib/skill-validate";

const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const rootDir = process.cwd();
const targets = collectTargets(args, rootDir);

if (targets.length === 0) {
  console.error("No skill.json files found.");
  process.exit(1);
}

const schemaErrors: Array<{ file: string; path: string; message: string }> = [];
const validSkills: SkillDoc[] = [];

for (const filePath of targets) {
  const relativePath = toRepoRelative(filePath, rootDir);
  if (!relativePath.endsWith("skill.json")) {
    schemaErrors.push({
      file: relativePath,
      path: "$",
      message: "SkillSpec must be JSON (skill.json).",
    });
    continue;
  }
  let data: unknown;
  try {
    data = loadJsonFile(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    schemaErrors.push({ file: relativePath, path: "$", message: `parse error: ${message}` });
    continue;
  }
  const errors = validateSchema(data);
  if (errors.length > 0) {
    for (const err of errors) {
      schemaErrors.push({ file: relativePath, path: err.path, message: err.message });
    }
    continue;
  }
  validSkills.push({ path: relativePath, data: data as Record<string, unknown> });
}

if (schemaErrors.length > 0) {
  printSchemaErrors(schemaErrors);
  process.exit(1);
}

const crossErrors = runCrossChecks(validSkills);
if (crossErrors.length > 0) {
  printCrossErrors(crossErrors);
  process.exit(2);
}

console.log(`SkillSpec validation passed for ${validSkills.length} file(s).`);

function printSchemaErrors(errors: Array<{ file: string; path: string; message: string }>): void {
  const sorted = errors
    .slice()
    .sort((a, b) => a.file.localeCompare(b.file) || a.path.localeCompare(b.path) || a.message.localeCompare(b.message));
  console.error("SkillSpec schema validation failed:");
  for (const error of sorted) {
    console.error(`[SCHEMA] ${error.file}: ${error.path} ${error.message}`);
  }
}

function printCrossErrors(errors: CrossCheckError[]): void {
  const sorted = errors
    .slice()
    .sort((a, b) => a.file.localeCompare(b.file) || a.path.localeCompare(b.path) || a.message.localeCompare(b.message));
  console.error("SkillSpec cross-checks failed:");
  for (const error of sorted) {
    console.error(`[CROSS] ${error.file}: ${error.path} ${error.message}`);
  }
}

function collectTargets(argsList: string[], root: string): string[] {
  if (argsList.length === 0 || argsList.includes("--all")) {
    return findSkillFiles(root);
  }
  const results: string[] = [];
  for (const arg of argsList) {
    if (arg === "--all") continue;
    const fullPath = resolve(root, arg);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      console.error(`Path not found: ${arg}`);
      continue;
    }
    if (stat.isDirectory()) {
      results.push(...findSkillFiles(fullPath));
    } else if (stat.isFile()) {
      results.push(fullPath);
    }
  }
  return Array.from(new Set(results)).sort();
}

function printUsage(): void {
  console.log("Usage: bun develop/tools/skill/validate.ts [--all] [path ...]");
}
