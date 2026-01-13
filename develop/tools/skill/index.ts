#!/usr/bin/env bun
import { mkdirSync, statSync, writeFileSync } from "fs";
import { resolve } from "path";
import { findSkillFiles, loadYamlFile, sortKeys, stableStringify, toRepoRelative } from "./lib/skill-io";
import { validateSchema } from "./lib/skill-validate";

const rootDir = process.cwd();
const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const files = collectTargets(args, rootDir);
if (files.length === 0) {
  console.error("No skill.yaml files found.");
  process.exit(1);
}
const errors: Array<{ file: string; path: string; message: string }> = [];
const entriesById = new Map<string, Array<{ path: string; version: string }>>();

for (const filePath of files) {
  const relativePath = toRepoRelative(filePath, rootDir);
  let data: unknown;
  try {
    data = loadYamlFile(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({ file: relativePath, path: "$", message: `parse error: ${message}` });
    continue;
  }
  const schemaErrors = validateSchema(data);
  if (schemaErrors.length > 0) {
    for (const err of schemaErrors) {
      errors.push({ file: relativePath, path: err.path, message: err.message });
    }
    continue;
  }
  const skill = data as Record<string, unknown>;
  const skillId = skill.id as string;
  const list = entriesById.get(skillId) ?? [];
  list.push({ path: relativePath, version: skill.version as string });
  entriesById.set(skillId, list);
}

for (const [id, entries] of entriesById.entries()) {
  if (entries.length <= 1) continue;
  const locations = entries.map((entry) => entry.path).join(", ");
  for (const entry of entries) {
    errors.push({
      file: entry.path,
      path: "$.id",
      message: `duplicate id '${id}' also defined in ${locations}`,
    });
  }
}

if (errors.length > 0) {
  const sorted = errors
    .slice()
    .sort((a, b) => a.file.localeCompare(b.file) || a.path.localeCompare(b.path) || a.message.localeCompare(b.message));
  console.error("SkillSpec index generation failed:");
  for (const error of sorted) {
    console.error(`[SCHEMA] ${error.file}: ${error.path} ${error.message}`);
  }
  process.exit(1);
}

const index: Record<string, { path: string; version: string }> = {};
for (const [id, entries] of entriesById.entries()) {
  const entry = entries[0];
  index[id] = { path: entry.path, version: entry.version };
}

const outputDir = resolve(rootDir, "runtime", "skills");
mkdirSync(outputDir, { recursive: true });
const outputPath = resolve(outputDir, "index.json");
const canonical = stableStringify(sortKeys(index));
writeFileSync(outputPath, canonical, "utf8");
console.log(`Wrote ${toRepoRelative(outputPath, rootDir)} (${Object.keys(index).length} skills).`);

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
  console.log("Usage: bun develop/tools/skill/index.ts [--all] [path ...]");
}
