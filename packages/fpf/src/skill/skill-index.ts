import { resolve } from "path";
import { findSkillFiles, loadJsonFile, sortKeys, stableStringify, toRepoRelative } from "./skill-io.ts";

export type SkillIndexEntry = {
  id: string;
  invocation: string;
  package: string;
  spec_path: string;
  version: string;
};

export type SkillIndex = {
  schema_version: "1.0.0";
  skills: SkillIndexEntry[];
};

const skillPackageScope = "@venikman";
const skillPackagePrefix = "fpf-skill-";

export function buildSkillIndex(options: { rootDir: string }): SkillIndex {
  const skillsRoot = resolve(options.rootDir, "design", "skills");
  const skillFiles = findSkillFiles(skillsRoot);

  if (skillFiles.length === 0) {
    return { schema_version: "1.0.0", skills: [] };
  }

  const nonJsonSpecs = skillFiles.filter((filePath) => !filePath.endsWith("skill.json"));
  if (nonJsonSpecs.length > 0) {
    throw new Error("SkillSpec must be JSON (skill.json).");
  }

  const skills = skillFiles.map((filePath) => buildEntry(filePath, options.rootDir));
  skills.sort((a, b) => a.id.localeCompare(b.id));

  return { schema_version: "1.0.0", skills };
}

export function generateSkillIndexJson(options: { rootDir: string }): string {
  const index = buildSkillIndex(options);
  return stableStringify(sortKeys(index));
}

function buildEntry(filePath: string, rootDir: string): SkillIndexEntry {
  const data = loadJsonFile(filePath);
  if (!isPlainObject(data)) {
    throw new Error(`Invalid skill.json (expected object): ${filePath}`);
  }

  const id = String(data.id ?? "").trim();
  if (!id) {
    throw new Error(`Missing id in ${filePath}`);
  }

  const version = String(data.version ?? "").trim();
  if (!version) {
    throw new Error(`Missing version in ${filePath}`);
  }

  return {
    id,
    invocation: id,
    package: toPackageName(id),
    spec_path: toRepoRelative(filePath, rootDir),
    version,
  };
}

function toPackageName(skillId: string): string {
  const token = skillId.replace(/\//g, "-");
  return `${skillPackageScope}/${skillPackagePrefix}${token}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
