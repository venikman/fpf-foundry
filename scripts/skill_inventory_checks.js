#!/usr/bin/env bun
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const inventoryPath = path.join(repoRoot, "contexts", "Skills", "design", "SKILL_INVENTORY.md");
const skillsRoot = path.join(repoRoot, "contexts", "Skills");
const codeRoot = path.join(skillsRoot, "src");

const errors = [];

const inventory = parseInventory(inventoryPath, errors);
const skillDefinitions = collectSkillDefinitions(skillsRoot, errors);
const codeSkills = collectCodeSkills(codeRoot);

lintInventory(inventory, errors, inventoryPath);
crossCheckInventory(inventory, skillDefinitions, codeSkills, errors);
checkWorkEmission(inventory, codeRoot, errors);

if (errors.length > 0) {
    console.error("Skill inventory checks failed:");
    for (const error of errors) {
        console.error(`- ${error}`);
    }
    process.exit(1);
}

console.log("Skill inventory checks passed.");

function parseInventory(filePath, errorsList) {
    if (!fs.existsSync(filePath)) {
        errorsList.push(`Missing inventory file: ${toRepoRelative(filePath)}`);
        return [];
    }

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    const headerIndex = lines.findIndex((line) => line.trim().startsWith("| Skill ID |"));
    if (headerIndex === -1) {
        errorsList.push(`Inventory table header not found in ${toRepoRelative(filePath)}`);
        return [];
    }

    const headerCells = lines[headerIndex].split("|").map((cell) => cell.trim()).slice(1, -1);
    const numColumns = headerCells.length;
    const columnIndex = new Map(headerCells.map((name, index) => [name, index]));
    const requiredColumns = [
        "Skill ID",
        "Family",
        "PatternRefs",
        "PolicyRealization",
        "Status",
        "Impl",
        "Outputs",
        "Description",
    ];

    const missingColumns = requiredColumns.filter((column) => !columnIndex.has(column));
    if (missingColumns.length > 0) {
        errorsList.push(
            `Inventory table missing columns in ${toRepoRelative(filePath)}: ${missingColumns.join(", ")}`
        );
        return [];
    }

    const rows = [];
    for (let i = headerIndex + 2; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim().startsWith("|")) {
            break;
        }

        const cells = line.split("|").map((cell) => cell.trim());
        const values = cells.slice(1, -1);
        if (values.length !== numColumns) {
            errorsList.push(
                `${toRepoRelative(filePath)}:${i + 1} expected ${numColumns} columns, got ${values.length}`
            );
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

function lintInventory(rows, errorsList, filePath) {
    const seen = new Set();
    const allowedStatus = new Set(["planned", "experimental", "stable", "deprecated"]);
    const allowedImpl = new Set(["none", "stub", "code"]);
    const patternRefRegex = /^[A-Z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+){1,2}$/;

    for (const row of rows) {
        if (!row.skillId) {
            errorsList.push(`${toRepoRelative(filePath)}:${row.lineNumber} missing Skill ID`);
            continue;
        }

        if (seen.has(row.skillId)) {
            errorsList.push(`${toRepoRelative(filePath)}:${row.lineNumber} duplicate Skill ID '${row.skillId}'`);
        }
        seen.add(row.skillId);

        if (!row.family || row.family.trim().length === 0 || row.family.trim() === "-") {
            errorsList.push(`${toRepoRelative(filePath)}:${row.lineNumber} missing Family for '${row.skillId}'`);
        }

        if (!allowedStatus.has(row.status)) {
            errorsList.push(
                `${toRepoRelative(filePath)}:${row.lineNumber} invalid Status '${row.status}' for '${row.skillId}'`
            );
        }

        if (!allowedImpl.has(row.impl)) {
            errorsList.push(
                `${toRepoRelative(filePath)}:${row.lineNumber} invalid Impl '${row.impl}' for '${row.skillId}'`
            );
        }

        const policyRealization = row.policyRealization.trim();
        if (policyRealization.length === 0) {
            errorsList.push(
                `${toRepoRelative(filePath)}:${row.lineNumber} missing PolicyRealization for '${row.skillId}'`
            );
        } else if (policyRealization !== "-") {
            const isAuditRef = /^audit\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/.test(policyRealization);
            if (policyRealization !== "passive" && !isAuditRef) {
                errorsList.push(
                    `${toRepoRelative(filePath)}:${row.lineNumber} invalid PolicyRealization '${policyRealization}' for '${row.skillId}'`
                );
            }
        }

        if (row.patternRefsRaw !== "-") {
            const refs = row.patternRefsRaw.split(";").map((ref) => ref.trim());
            if (refs.some((ref) => ref.length === 0)) {
                errorsList.push(
                    `${toRepoRelative(filePath)}:${row.lineNumber} empty PatternRefs entry for '${row.skillId}'`
                );
                continue;
            }

            for (const ref of refs) {
                if (!patternRefRegex.test(ref)) {
                    errorsList.push(
                        `${toRepoRelative(filePath)}:${row.lineNumber} invalid PatternRef '${ref}' for '${row.skillId}'`
                    );
                }
            }
        }
    }
}

function crossCheckInventory(rows, skillDefinitions, codeSkills, errorsList) {
    const inventoryById = new Map(rows.map((row) => [row.skillId, row]));

    for (const row of rows) {
        if (row.impl !== "none" && !skillDefinitions.has(row.skillId)) {
            errorsList.push(`Missing SKILL.md for '${row.skillId}' (Impl=${row.impl})`);
        }

        if (row.impl === "code" && !codeSkills.has(row.skillId)) {
            errorsList.push(`Missing code implementation for '${row.skillId}' (expected ${codePathHint(row.skillId)})`);
        }

        const policyRealization = row.policyRealization.trim();
        if (policyRealization.startsWith("audit/") && !inventoryById.has(policyRealization)) {
            errorsList.push(
                `PolicyRealization '${policyRealization}' for '${row.skillId}' does not match an inventory Skill ID`
            );
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

function checkWorkEmission(rows, codeRootPath, errorsList) {
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

function collectSkillDefinitions(skillsRootPath, errorsList) {
    const definitions = new Map();
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
            errorsList.push(`Duplicate SKILL.md name '${name}' in ${toRepoRelative(filePath)}`);
            return;
        }

        definitions.set(name, filePath);
    });

    return definitions;
}

function collectCodeSkills(codeRootPath) {
    const codeSkills = new Set();
    if (!fs.existsSync(codeRootPath)) {
        return codeSkills;
    }

    walk(codeRootPath, (filePath) => {
        const base = path.basename(filePath);
        if (base !== "index.ts" && base !== "index.js") {
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

function stripComments(content) {
    return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function extractSkillName(filePath) {
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

function resolveCodePath(codeRootPath, skillId) {
    const parts = skillId.split("/");
    const tsPath = path.join(codeRootPath, ...parts, "index.ts");
    if (fs.existsSync(tsPath)) {
        return tsPath;
    }

    const jsPath = path.join(codeRootPath, ...parts, "index.js");
    if (fs.existsSync(jsPath)) {
        return jsPath;
    }

    return null;
}

function codePathHint(skillId) {
    return toRepoRelative(path.join(codeRoot, ...skillId.split("/"), "index.ts"));
}

function stripBackticks(value) {
    return value.replace(/^`+|`+$/g, "");
}

function walk(dir, visitor) {
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

function toRepoRelative(filePath) {
    return toPosix(path.relative(repoRoot, filePath));
}

function toPosix(filePath) {
    return filePath.split(path.sep).join("/");
}
