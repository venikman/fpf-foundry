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

const expectedYamlPath = resolve(repoRoot, "design", "examples", "compile", "expected", `${skillId}.skill.yaml`);
let expectedYaml: string;
try {
  expectedYaml = readFileSync(expectedYamlPath, "utf8").trimEnd();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Mock model: missing expected fixture for skill id '${skillId}': ${expectedYamlPath} (${message})`);
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
  process.stdout.write(renderYamlOnly(expectedYaml));
  process.exit(0);
}

process.stdout.write(renderYamlWithReport(expectedYaml, report));

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

function renderYamlOnly(yaml: string): string {
  return `\`\`\`yaml\n${yaml}\n\`\`\`\n`;
}

function renderYamlWithReport(yaml: string, reportData: unknown): string {
  const reportJson = JSON.stringify(reportData, null, 2);
  return `\`\`\`yaml\n${yaml}\n\`\`\`\n\`\`\`json\n${reportJson}\n\`\`\`\n`;
}

