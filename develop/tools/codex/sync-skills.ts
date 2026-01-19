#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

type SkillDoc = {
  id: string;
  sourcePath: string;
  outputDir: string;
  outputPath: string;
  content: string;
};

const repoRoot = process.cwd();
const sourceRoot = resolve(repoRoot, "design", "skills");
const targetRoot = resolve(repoRoot, ".codex", "skills");

const skillDocs = findSkillDocs(sourceRoot);
if (skillDocs.length === 0) {
  console.error("No SKILL.md files found under design/skills.");
  process.exit(1);
}

const outputs: SkillDoc[] = [];
const flatNameMap = new Map<string, string>();

for (const sourcePath of skillDocs) {
  const skillId = resolveSkillId(sourcePath, sourceRoot);
  const flatName = skillId.replace(/\//g, "-");
  const existing = flatNameMap.get(flatName);
  if (existing && existing !== skillId) {
    console.error(`Codex skill name collision: '${flatName}' maps to both '${existing}' and '${skillId}'.`);
    process.exit(1);
  }
  flatNameMap.set(flatName, skillId);

  const raw = readFileSync(sourcePath, "utf8");
  const content = normalizeSkillDoc(raw);
  const outputDir = join(targetRoot, flatName);
  outputs.push({
    id: skillId,
    sourcePath,
    outputDir,
    outputPath: join(outputDir, "SKILL.md"),
    content,
  });
}

mkdirSync(targetRoot, { recursive: true });
pruneStaleSkillDirs(targetRoot, new Set(outputs.map((entry) => entry.outputDir)));

for (const entry of outputs) {
  mkdirSync(entry.outputDir, { recursive: true });
  writeFileSync(entry.outputPath, entry.content, "utf8");
}

console.log(`Synced ${outputs.length} Codex skill doc(s) to ${toRepoRelative(targetRoot, repoRoot)}.`);

function findSkillDocs(rootDir: string): string[] {
  const results: string[] = [];
  walk(rootDir, results);
  return results.sort();

  function walk(dir: string, list: string[]): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, list);
      } else if (entry.isFile() && entry.name === "SKILL.md") {
        list.push(fullPath);
      }
    }
  }
}

function resolveSkillId(skillDocPath: string, skillsRoot: string): string {
  const rel = relative(skillsRoot, dirname(skillDocPath));
  if (!rel || rel === "." || rel.startsWith(`..${sep}`)) {
    console.error(`Invalid SKILL.md location: ${skillDocPath}`);
    process.exit(1);
  }
  return rel.split(sep).join("/");
}

function normalizeSkillDoc(content: string): string {
  let normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0] === "---") {
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i] === "---") break;
      const match = lines[i].match(/^(\s*)allowed_tools:/);
      if (match) {
        lines[i] = `${match[1]}allowed-tools:${lines[i].slice(match[0].length)}`;
      }
    }
    normalized = lines.join("\n");
  }
  if (!normalized.endsWith("\n")) {
    normalized += "\n";
  }
  return normalized;
}

function pruneStaleSkillDirs(rootDir: string, desiredDirs: Set<string>): void {
  if (!existsSync(rootDir)) {
    return;
  }
  const entries = readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const fullPath = join(rootDir, entry.name);
    if (!desiredDirs.has(fullPath)) {
      rmSync(fullPath, { recursive: true, force: true });
    }
  }
}

function toRepoRelative(filePath: string, rootDir: string): string {
  const rel = relative(rootDir, filePath);
  return rel.length === 0 ? "." : rel.split("\\").join("/");
}
