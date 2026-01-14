import * as fs from "fs";
import * as path from "path";

export function runInventoryChecks(rootDir: string): string[] {
  const inventoryPath = path.join(rootDir, "design", "skills", "SKILL_INVENTORY.md");
  const skillsRoot = path.join(rootDir, "design", "skills");
  const codeRoot = path.join(rootDir, "develop", "skills", "src");

  const errors: string[] = [];

  const inventory = parseInventory(rootDir, inventoryPath, errors);
  const skillDefinitions = collectSkillDefinitions(rootDir, skillsRoot, errors);
  const codeSkills = collectCodeSkills(codeRoot);

  lintInventory(rootDir, inventory, errors, inventoryPath);
  crossCheckInventory(rootDir, inventory, skillDefinitions, codeSkills, errors, skillsRoot, codeRoot);
  checkWorkEmission(rootDir, inventory, codeRoot, errors);

  return errors;
}

type InventoryRow = {
  lineNumber: number;
  skillId: string;
  family: string;
  patternRefsRaw: string;
  policyRealization: string;
  status: string;
  impl: string;
  outputs: string;
  description: string;
};

function parseInventory(rootDir: string, filePath: string, errorsList: string[]): InventoryRow[] {
  if (!fs.existsSync(filePath)) {
    errorsList.push(`Missing inventory file: ${toRepoRelative(rootDir, filePath)}`);
    return [];
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim().startsWith("| Skill ID |"));
  if (headerIndex === -1) {
    errorsList.push(`Inventory table header not found in ${toRepoRelative(rootDir, filePath)}`);
    return [];
  }

  const headerCells = lines[headerIndex]
    .split("|")
    .map((cell) => cell.trim())
    .slice(1, -1);
  const numColumns = headerCells.length;
  const columnIndex = new Map(headerCells.map((name, index) => [name, index]));
  const requiredColumns = ["Skill ID", "Family", "PatternRefs", "PolicyRealization", "Status", "Impl", "Outputs", "Description"];

  const missingColumns = requiredColumns.filter((column) => !columnIndex.has(column));
  if (missingColumns.length > 0) {
    errorsList.push(`Inventory table missing columns in ${toRepoRelative(rootDir, filePath)}: ${missingColumns.join(", ")}`);
    return [];
  }

  const rows: InventoryRow[] = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) {
      break;
    }

    const cells = line.split("|").map((cell) => cell.trim());
    const values = cells.slice(1, -1);
    if (values.length !== numColumns) {
      errorsList.push(`${toRepoRelative(rootDir, filePath)}:${i + 1} expected ${numColumns} columns, got ${values.length}`);
      continue;
    }

    const skillIdRaw = values[columnIndex.get("Skill ID")];
    const family = values[columnIndex.get("Family")];
    const patternRefsRaw = values[columnIndex.get("PatternRefs")];
    const policyRealization = values[columnIndex.get("PolicyRealization")];
    const status = values[columnIndex.get("Status")];
    const impl = values[columnIndex.get("Impl")];
    const outputs = values[columnIndex.get("Outputs")];
    const description = values[columnIndex.get("Description")];
    const skillId = stripBackticks(skillIdRaw);

    rows.push({
      lineNumber: i + 1,
      skillId,
      family,
      patternRefsRaw,
      policyRealization,
      status,
      impl,
      outputs,
      description,
    });
  }

  return rows;
}

function lintInventory(rootDir: string, rows: InventoryRow[], errorsList: string[], filePath: string): void {
  const seen = new Set<string>();
  const allowedStatus = new Set(["planned", "experimental", "stable", "deprecated"]);
  const allowedImpl = new Set(["none", "stub", "code"]);
  const patternRefRegex = /^[A-Z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+){1,2}$/;

  for (const row of rows) {
    if (!row.skillId) {
      errorsList.push(`${toRepoRelative(rootDir, filePath)}:${row.lineNumber} missing Skill ID`);
      continue;
    }

    if (seen.has(row.skillId)) {
      errorsList.push(`${toRepoRelative(rootDir, filePath)}:${row.lineNumber} duplicate Skill ID '${row.skillId}'`);
    }
    seen.add(row.skillId);

    if (!row.family || row.family.trim().length === 0 || row.family.trim() === "-") {
      errorsList.push(`${toRepoRelative(rootDir, filePath)}:${row.lineNumber} missing Family for '${row.skillId}'`);
    }

    if (!allowedStatus.has(row.status)) {
      errorsList.push(`${toRepoRelative(rootDir, filePath)}:${row.lineNumber} invalid Status '${row.status}' for '${row.skillId}'`);
    }

    if (!allowedImpl.has(row.impl)) {
      errorsList.push(`${toRepoRelative(rootDir, filePath)}:${row.lineNumber} invalid Impl '${row.impl}' for '${row.skillId}'`);
    }

    const policyRealization = row.policyRealization.trim();
    if (policyRealization.length === 0) {
      errorsList.push(`${toRepoRelative(rootDir, filePath)}:${row.lineNumber} missing PolicyRealization for '${row.skillId}'`);
    } else if (policyRealization !== "-") {
      const isAuditRef = /^audit\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/.test(policyRealization);
      if (policyRealization !== "passive" && !isAuditRef) {
        errorsList.push(`${toRepoRelative(rootDir, filePath)}:${row.lineNumber} invalid PolicyRealization '${policyRealization}' for '${row.skillId}'`);
      }
    }

    if (row.patternRefsRaw !== "-") {
      const refs = row.patternRefsRaw.split(";").map((ref) => ref.trim());
      if (refs.some((ref) => ref.length === 0)) {
        errorsList.push(`${toRepoRelative(rootDir, filePath)}:${row.lineNumber} empty PatternRefs entry for '${row.skillId}'`);
        continue;
      }

      for (const ref of refs) {
        if (!patternRefRegex.test(ref)) {
          errorsList.push(`${toRepoRelative(rootDir, filePath)}:${row.lineNumber} invalid PatternRef '${ref}' for '${row.skillId}'`);
        }
      }
    }
  }
}

function crossCheckInventory(
  rootDir: string,
  rows: InventoryRow[],
  skillDefinitions: Map<string, string>,
  codeSkills: Set<string>,
  errorsList: string[],
  skillsRoot: string,
  codeRoot: string,
): void {
  const inventoryById = new Map(rows.map((row) => [row.skillId, row]));

  for (const row of rows) {
    if (row.impl !== "none" && !skillDefinitions.has(row.skillId)) {
      errorsList.push(`Missing SKILL.md for '${row.skillId}' (Impl=${row.impl})`);
    }

    const specPath = resolveSpecPath(skillsRoot, row.skillId);
    if (!fs.existsSync(specPath)) {
      errorsList.push(`Missing skill.json for '${row.skillId}' (expected ${toRepoRelative(rootDir, specPath)})`);
    }

    if (row.impl === "code" && !codeSkills.has(row.skillId)) {
      errorsList.push(`Missing code implementation for '${row.skillId}' (expected ${codePathHint(codeRoot, row.skillId)})`);
    }

    const policyRealization = row.policyRealization.trim();
    if (policyRealization.startsWith("audit/") && !inventoryById.has(policyRealization)) {
      errorsList.push(`PolicyRealization '${policyRealization}' for '${row.skillId}' does not match an inventory Skill ID`);
    }
  }

  for (const skillId of codeSkills) {
    const row = inventoryById.get(skillId);
    if (!row) {
      errorsList.push(`Code implementation '${skillId}' missing from inventory`);
      continue;
    }
    if (row.impl !== "code") {
      errorsList.push(`Code implementation '${skillId}' has Impl='${row.impl}' in inventory`);
    }
  }
}

function checkWorkEmission(rootDir: string, rows: InventoryRow[], codeRootPath: string, errorsList: string[]): void {
  const statusesRequiringWork = new Set(["experimental", "stable"]);
  for (const row of rows) {
    if (!statusesRequiringWork.has(row.status) || row.impl !== "code") {
      continue;
    }

    const codePath = resolveCodePath(codeRootPath, row.skillId);
    if (!codePath) {
      continue;
    }

    const content = fs.readFileSync(codePath, "utf8");
    const stripped = stripComments(content);
    const emitsWork = /\bU\.Work\b/.test(stripped) || /\blog-work\b/.test(stripped);
    if (!emitsWork) {
      errorsList.push(`Skill '${row.skillId}' (status=${row.status}) does not appear to emit U.Work`);
    }
  }
}

function collectSkillDefinitions(rootDir: string, skillsRootPath: string, errorsList: string[]): Map<string, string> {
  const definitions = new Map<string, string>();
  if (!fs.existsSync(skillsRootPath)) {
    return definitions;
  }

  walk(skillsRootPath, (filePath) => {
    if (path.basename(filePath) !== "SKILL.md") {
      return;
    }

    const name = extractSkillName(filePath);
    if (!name) {
      return;
    }

    if (definitions.has(name)) {
      errorsList.push(`Duplicate SKILL.md name '${name}' in ${toRepoRelative(rootDir, filePath)}`);
      return;
    }

    definitions.set(name, filePath);
  });

  return definitions;
}

function collectCodeSkills(codeRootPath: string): Set<string> {
  const codeSkills = new Set<string>();
  if (!fs.existsSync(codeRootPath)) {
    return codeSkills;
  }

  walk(codeRootPath, (filePath) => {
    const base = path.basename(filePath);
    if (base !== "index.ts") {
      return;
    }

    const skillDir = path.dirname(filePath);
    const relative = path.relative(codeRootPath, skillDir);
    if (!relative || relative.startsWith("..")) {
      return;
    }

    codeSkills.add(toPosix(relative));
  });

  return codeSkills;
}

function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function extractSkillName(filePath: string): string | null {
  const content = fs.readFileSync(filePath, "utf8");
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const nameLine = frontmatter.split(/\r?\n/).find((line) => line.startsWith("name:"));
  if (!nameLine) {
    return null;
  }

  const value = nameLine.replace(/^name:\s*/, "").trim();
  return value.replace(/^["']|["']$/g, "");
}

function resolveCodePath(codeRootPath: string, skillId: string): string | null {
  const parts = skillId.split("/");
  const tsPath = path.join(codeRootPath, ...parts, "index.ts");
  if (fs.existsSync(tsPath)) {
    return tsPath;
  }

  return null;
}

function resolveSpecPath(skillsRootPath: string, skillId: string): string {
  return path.join(skillsRootPath, ...skillId.split("/"), "skill.json");
}

function codePathHint(codeRootPath: string, skillId: string): string {
  return toPosix(path.join(codeRootPath, ...skillId.split("/"), "index.ts"));
}

function stripBackticks(value: string): string {
  return value.replace(/^`+|`+$/g, "");
}

function walk(dir: string, visitor: (filePath: string) => void): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, visitor);
    } else {
      visitor(fullPath);
    }
  }
}

function toRepoRelative(rootDir: string, filePath: string): string {
  return toPosix(path.relative(rootDir, filePath));
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

