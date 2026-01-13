#!/usr/bin/env bun
import { readFileSync } from "fs";
import { resolve } from "path";

const repoRoot = process.cwd();
const prompt = await new Response(Bun.stdin).text();

const mode = parseMode(prompt);
const sourceText = extractSection(prompt, "SOURCE_TEXT:", "CONTEXT:");
const skillId = parseSkillId(sourceText);
if (!skillId) {
  console.error("Mock model: failed to locate 'Skill ID:' in SOURCE_TEXT.");
  process.exit(1);
}

const expectedJsonPath = resolve(repoRoot, "design", "examples", "compile", "expected", `${skillId}.skill.json`);
let expectedJson: string;
try {
  expectedJson = readFileSync(expectedJsonPath, "utf8").trimEnd();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Mock model: missing expected fixture for skill id '${skillId}': ${expectedJsonPath} (${message})`);
  process.exit(1);
}

const report = {
  missing_required: [],
  assumptions: ["mock-model used (no external inference)"],
  evidence_warnings: [],
  validation: { passed: true, errors: [] },
  notes: "Deterministic fixture output (develop/tools/compile/mock-model.ts).",
};

if (mode === "fast") {
  process.stdout.write(renderJsonOnly(expectedJson));
  process.exit(0);
}

process.stdout.write(renderJsonWithReport(expectedJson, report));

function extractSection(text: string, startMarker: string, endMarker: string): string {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    return "";
  }
  const afterStart = text.slice(startIndex + startMarker.length);
  const endIndex = afterStart.indexOf(endMarker);
  const section = endIndex === -1 ? afterStart : afterStart.slice(0, endIndex);
  return section.trim();
}

function parseSkillId(text: string): string | null {
  const match = text.match(/^\s*Skill ID:\s*([^\s]+)\s*$/m);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

function parseMode(text: string): string {
  const match = text.match(/\bMODE\s*=\s*([a-z]+)\b/i);
  return (match?.[1] ?? "strict").toLowerCase();
}

function renderJsonOnly(json: string): string {
  return `\`\`\`json\n${json}\n\`\`\`\n`;
}

function renderJsonWithReport(json: string, reportData: unknown): string {
  const reportJson = JSON.stringify(reportData, null, 2);
  return `\`\`\`json\n${json}\n\`\`\`\n\`\`\`json\n${reportJson}\n\`\`\`\n`;
}
