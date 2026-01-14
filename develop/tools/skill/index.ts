#!/usr/bin/env bun
import { mkdirSync, statSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { findSkillFiles, loadJsonFile, sortKeys, stableStringify, toRepoRelative } from "./lib/skill-io";
import { validateSchema } from "./lib/skill-validate";

type CliOptions = {
  outPath: string;
  includeAll: boolean;
  targets: string[];
};

type SkillIndexEntry = {
  id: string;
  invocation: string;
  package: string;
  spec_path: string;
  version: string;
};

type SkillIndex = {
  schema_version: "1.0.0";
  skills: SkillIndexEntry[];
};

const skillPackageScope = "@venikman";
const skillPackagePrefix = "fpf-skill-";

const rootDir = process.cwd();
const options = parseArgs(process.argv.slice(2), rootDir);

const files = collectTargets(options.targets, rootDir, options.includeAll);
if (files.length === 0) {
  console.error("No skill.json files found.");
  process.exit(1);
}
const errors: Array<{ file: string; path: string; message: string }> = [];
const entriesById = new Map<string, Array<{ path: string; version: string }>>();

for (const filePath of files) {
  const relativePath = toRepoRelative(filePath, rootDir);
  if (!relativePath.endsWith("skill.json")) {
    errors.push({ file: relativePath, path: "$", message: "SkillSpec must be JSON (skill.json)." });
    continue;
  }
  let data: unknown;
  try {
    data = loadJsonFile(filePath);
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
  for (const entry of entries) {
    const otherLocations = entries
      .filter((other) => other.path !== entry.path)
      .map((other) => other.path)
      .join(", ");
    errors.push({
      file: entry.path,
      path: "$.id",
      message: otherLocations.length > 0 ? `duplicate id '${id}' also defined in ${otherLocations}` : `duplicate id '${id}'`,
    });
  }
}

if (errors.length > 0) {
  const sorted = errors.slice().sort((a, b) => a.file.localeCompare(b.file) || a.path.localeCompare(b.path) || a.message.localeCompare(b.message));
  console.error("SkillSpec index generation failed:");
  for (const error of sorted) {
    console.error(`[SCHEMA] ${error.file}: ${error.path} ${error.message}`);
  }
  process.exit(1);
}

const index = buildIndex(entriesById);
mkdirSync(dirname(options.outPath), { recursive: true });
const canonical = stableStringify(sortKeys(index));
writeFileSync(options.outPath, canonical, "utf8");
console.log(`Wrote ${toRepoRelative(options.outPath, rootDir)} (${index.skills.length} skills).`);

function collectTargets(argsList: string[], root: string, includeAll: boolean): string[] {
  if (includeAll) {
    return findSkillFiles(root);
  }
  if (argsList.length === 0) {
    return findSkillFiles(resolve(root, "design", "skills"));
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
  console.log("Usage: bun develop/tools/skill/index.ts [--out <path>] [--all] [path ...]");
  console.log("Defaults to searching skill.json under design/skills/ (use --all for repo-wide).");
  console.log("Default output: runtime/skills/index.json");
  console.log("Excluded directories: .git/, node_modules/, .codex/, runtime/.");
  console.log("Note: .codex/ is reserved for Codex CLI SKILL.md packages (not SkillSpec).");
}

function parseArgs(argv: string[], repoRoot: string): CliOptions {
  let outPath = resolve(repoRoot, "runtime", "skills", "index.json");
  let includeAll = false;
  const targets: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--all") {
      includeAll = true;
      continue;
    }
    if (arg === "--out") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        console.error("Missing value for --out.");
        process.exit(1);
      }
      outPath = resolve(repoRoot, value);
      i += 1;
      continue;
    }
    targets.push(arg);
  }

  return { outPath, includeAll, targets };
}

function buildIndex(entriesById: Map<string, Array<{ path: string; version: string }>>): SkillIndex {
  const skills: SkillIndexEntry[] = [];
  for (const [id, entries] of entriesById.entries()) {
    const entry = entries[0];
    skills.push({
      id,
      invocation: id,
      package: toPackageName(id),
      spec_path: entry.path,
      version: entry.version,
    });
  }

  skills.sort((a, b) => a.id.localeCompare(b.id));

  return { schema_version: "1.0.0", skills };
}

function toPackageName(skillId: string): string {
  const token = skillId.replace(/\//g, "-");
  return `${skillPackageScope}/${skillPackagePrefix}${token}`;
}
