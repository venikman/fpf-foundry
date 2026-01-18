#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { findSkillFiles, loadJsonFile, parseYaml, toRepoRelative } from "./lib/skill-io";

type InventoryEntry = {
  id: string;
  family: string;
  patternRefs: string;
  policyRealization: string;
  status: string;
  impl: string;
  outputs: string;
  description: string;
};

type Frontmatter = Record<string, unknown>;

type Options = {
  skillsRoot: string;
  outputPath: string;
};

const rootDir = process.cwd();
const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const options = parseArgs(args, rootDir);
const skillFiles = findSkillFiles(options.skillsRoot);
if (skillFiles.length === 0) {
  console.error("No skill.json files found.");
  process.exit(1);
}

const nonJsonSpecs = skillFiles.map((filePath) => toRepoRelative(filePath, rootDir)).filter((relativePath) => !relativePath.endsWith("skill.json"));
if (nonJsonSpecs.length > 0) {
  console.error("SkillSpec must be JSON (skill.json). Found non-JSON SkillSpec files:");
  for (const relativePath of nonJsonSpecs) {
    console.error(`- ${relativePath}`);
  }
  process.exit(1);
}

const entries = skillFiles.map((filePath) => buildEntry(filePath, rootDir));
entries.sort((a, b) => a.id.localeCompare(b.id));

const content = renderInventory(entries);
writeFileSync(options.outputPath, content, "utf8");
console.log(`Wrote ${toRepoRelative(options.outputPath, rootDir)} (${entries.length} skills).`);

/**
 * Parses CLI arguments and resolves inventory paths.
 */
function parseArgs(argv: string[], repoRoot: string): Options {
  const options: Options = {
    skillsRoot: resolve(repoRoot, "design", "skills"),
    outputPath: resolve(repoRoot, "design", "skills", "SKILL_INVENTORY.md"),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      options.skillsRoot = resolve(repoRoot, getArgValue(argv, i, "--root"));
      i += 1;
      continue;
    }
    if (arg === "--out") {
      options.outputPath = resolve(repoRoot, getArgValue(argv, i, "--out"));
      i += 1;
    }
  }

  return options;
}

/**
 * Builds an inventory entry from a single skill.json file.
 */
function buildEntry(filePath: string, repoRoot: string): InventoryEntry {
  const skillData = loadJsonFile(filePath);
  if (!isPlainObject(skillData)) {
    throw new Error(`Invalid skill.json (expected object): ${filePath}`);
  }

  const id = String(skillData.id ?? "").trim();
  if (!id) {
    throw new Error(`Missing id in ${filePath}`);
  }

  const summary = String(skillData.summary ?? "").trim();
  const skillDir = dirname(filePath);
  const skillMdPath = join(skillDir, "SKILL.md");
  const frontmatter = existsSync(skillMdPath) ? loadFrontmatter(skillMdPath) : null;

  const impl = resolveImpl(id, repoRoot, existsSync(skillMdPath));
  const family = resolveFamily(frontmatter, id, skillData);
  const status = resolveStatus(frontmatter, impl);
  const patternRefs = resolvePatternRefs(frontmatter);
  const outputs = resolveOutputs(frontmatter, skillData);

  return {
    id,
    family,
    patternRefs,
    policyRealization: "-",
    status,
    impl,
    outputs,
    description: summary || "UNKNOWN",
  };
}

/**
 * Loads YAML frontmatter from a SKILL.md file when present.
 */
function loadFrontmatter(filePath: string): Frontmatter | null {
  const text = readFileSync(filePath, "utf8");
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) {
    return null;
  }
  try {
    const data = parseYaml(match[1], `${filePath}:frontmatter`);
    return isPlainObject(data) ? data : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse frontmatter in ${filePath}: ${message}`);
  }
}

/**
 * Resolves implementation availability for a skill.
 */
function resolveImpl(id: string, repoRoot: string, hasSkillMd: boolean): string {
  const codeRoot = resolve(repoRoot, "develop", "skills", "src");
  const parts = id.split("/");
  const tsPath = join(codeRoot, ...parts, "index.ts");
  const jsPath = join(codeRoot, ...parts, "index.js");
  if (existsSync(tsPath) || existsSync(jsPath)) {
    return "code";
  }
  return hasSkillMd ? "stub" : "none";
}

/**
 * Resolves a skill family label based on frontmatter or metadata.
 */
function resolveFamily(frontmatter: Frontmatter | null, id: string, skillData: Record<string, unknown>): string {
  const frontFamily = frontmatter && typeof frontmatter.family === "string" ? frontmatter.family : "";
  if (frontFamily.trim().length > 0) {
    return toTitleCase(frontFamily);
  }

  const meta = skillData.metadata as Record<string, unknown> | undefined;
  const tags = meta?.tags;
  if (Array.isArray(tags) && typeof tags[0] === "string" && tags[0].trim().length > 0) {
    return toTitleCase(tags[0]);
  }

  const segment = id.split("/")[0] ?? id;
  return toTitleCase(segment);
}

/**
 * Resolves a skill status based on frontmatter or implementation state.
 */
function resolveStatus(frontmatter: Frontmatter | null, impl: string): string {
  const status = frontmatter && typeof frontmatter.status === "string" ? frontmatter.status : "";
  if (status.trim().length > 0) {
    return status.trim();
  }
  if (impl === "code") {
    return "experimental";
  }
  if (impl === "stub") {
    return "planned";
  }
  return "planned";
}

/**
 * Extracts pattern references declared in frontmatter.
 */
function resolvePatternRefs(frontmatter: Frontmatter | null): string {
  if (!frontmatter) {
    return "-";
  }

  const refs = new Set<string>();

  const metadata = frontmatter.metadata as Record<string, unknown> | undefined;
  if (metadata && typeof metadata.fpf_id === "string") {
    refs.add(metadata.fpf_id.trim());
  }

  const policies = frontmatter.policies;
  if (Array.isArray(policies)) {
    for (const entry of policies) {
      if (typeof entry !== "string") continue;
      for (const match of entry.matchAll(/[A-Z]\.\d+(?:\.\d+){0,2}/g)) {
        refs.add(match[0]);
      }
    }
  }

  if (refs.size === 0) {
    return "-";
  }

  return Array.from(refs).sort().join("; ");
}

/**
 * Resolves outputs from SKILL.md frontmatter or falls back to skill.json outputs.
 */
function resolveOutputs(frontmatter: Frontmatter | null, skillData: Record<string, unknown>): string {
  const entries: string[] = [];

  const frontOutputs = frontmatter?.outputs;
  if (typeof frontOutputs === "string") {
    entries.push(frontOutputs);
  } else if (Array.isArray(frontOutputs)) {
    for (const entry of frontOutputs) {
      if (typeof entry === "string") {
        entries.push(entry);
      }
    }
  }

  if (entries.length === 0) {
    const skillOutputs = skillData.outputs;
    if (typeof skillOutputs === "string") {
      entries.push(skillOutputs);
    } else if (Array.isArray(skillOutputs)) {
      for (const entry of skillOutputs) {
        if (typeof entry === "string") {
          entries.push(entry);
        } else if (isPlainObject(entry) && typeof entry.name === "string") {
          entries.push(entry.name);
        }
      }
    }
  }

  const unique = Array.from(new Set(entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0))).sort((a, b) => a.localeCompare(b));
  if (unique.length === 0) {
    return "-";
  }

  return unique.join("; ");
}

/**
 * Renders the inventory markdown table from collected entries.
 */
function renderInventory(entries: InventoryEntry[]): string {
  const lines: string[] = [];
  lines.push("# FPF Skill Inventory (Generated)");
  lines.push("");
  lines.push("This file is generated from skill.json files. Do not edit manually.");
  lines.push("");
  lines.push("## Inventory schema (v1)");
  lines.push("");
  lines.push("Columns");
  lines.push("- Skill ID: canonical ID, also used as path segment under `develop/skills/src/`.");
  lines.push('- Family: required taxonomy. It MUST mean "capability area" (not a duplicate of namespace).');
  lines.push("- PatternRefs: `;`-separated list of spec pattern identifiers (example: `E.9; A.10`). Use `-` if none.");
  lines.push("- PolicyRealization: constraint realization strategy (`passive` or `audit/<skill-id>`). Use `-` if not applicable.");
  lines.push("- Status: one of `planned | experimental | stable | deprecated`.");
  lines.push("- Impl: one of `none | stub | code` (stub = SKILL.md exists but no runnable implementation yet).");
  lines.push("- Outputs: `;`-separated list of primary artifacts besides `U.Work` (example: `NameCard; WorkPlan`). Use `-` if none.");
  lines.push("- Description: short summary of the Skill's intent.");
  lines.push("");
  lines.push("| Skill ID | Family | PatternRefs | PolicyRealization | Status | Impl | Outputs | Description |");
  lines.push("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |");
  for (const entry of entries) {
    lines.push(
      `| \`${entry.id}\` | ${entry.family} | ${entry.patternRefs} | ${entry.policyRealization} | ${entry.status} | ${entry.impl} | ${entry.outputs} | ${entry.description} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Converts a slug-like token into Title Case.
 */
function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Reads the next CLI argument value or exits.
 */
function getArgValue(argv: string[], index: number, name: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`Missing value for ${name}.`);
    process.exit(1);
  }
  return value;
}

/**
 * Returns true when a value is a plain object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Prints CLI usage information.
 */
function printUsage(): void {
  console.log("Usage: bun develop/tools/skill/inventory.ts [--root <skills-root>] [--out <file>]");
}
