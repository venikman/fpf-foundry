#!/usr/bin/env bun
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { compileOnce, Mode } from "./lib/compile-core";
import { parseYaml, sortKeys, stableStringify, toRepoRelative } from "../skill/lib/skill-io";
import { CrossCheckError, SchemaError, SkillDoc, runCrossChecks, validateSchema } from "../skill/lib/skill-validate";

type CliOptions = {
  sourcePath: string;
  schemaPath: string;
  contextPath?: string;
  promptPath?: string;
  mode: Mode;
  outDir: string;
  modelCmd: string;
};

const rootDir = process.cwd();
const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const options = parseArgs(args, rootDir);
if (!options.sourcePath) {
  console.error("Missing --source.");
  printUsage();
  process.exit(1);
}
if (!options.modelCmd) {
  console.error("Missing model command. Use --model-cmd or set MODEL_CMD.");
  printUsage();
  process.exit(1);
}

const schemaText = readText(options.schemaPath);
const sourceText = readText(options.sourcePath);
const contextText = options.contextPath ? readText(options.contextPath) : "NONE";
const promptPath = options.promptPath ?? defaultPromptPath(options.mode, rootDir);
const promptTemplate = readText(promptPath);

let compileResult;
try {
  compileResult = compileOnce({
    mode: options.mode,
    promptTemplate,
    targetSchema: schemaText,
    sourceText,
    contextText,
    modelCmd: options.modelCmd,
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Compile failed: ${message}`);
  process.exit(1);
}

const skillYaml = ensureTrailingNewline(compileResult.skillYaml);
let skillData: Record<string, unknown>;
try {
  const parsed = parseYaml(skillYaml, "skill.yaml");
  if (!isPlainObject(parsed)) {
    throw new Error("SkillSpec root must be an object.");
  }
  skillData = parsed;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to parse skill.yaml: ${message}`);
  process.exit(1);
}

const skillId = typeof skillData.id === "string" ? skillData.id.trim() : "";
if (!skillId) {
  console.error("SkillSpec is missing a valid id.");
  process.exit(1);
}

const outputDir = resolve(options.outDir, skillId);
mkdirSync(outputDir, { recursive: true });
const skillPath = resolve(outputDir, "skill.yaml");
writeFileSync(skillPath, skillYaml, "utf8");
const normalizedJson = stableStringify(sortKeys(skillData));
const normalizedPath = resolve(outputDir, "skill.json");
writeFileSync(normalizedPath, normalizedJson, "utf8");

let reportData: unknown | undefined;
if (compileResult.compileReportJson) {
  reportData = JSON.parse(compileResult.compileReportJson);
  const reportPath = resolve(outputDir, "compile-report.json");
  writeFileSync(reportPath, `${JSON.stringify(reportData, null, 2)}\n`, "utf8");
}

const schemaErrors = validateSchema(skillData);
if (schemaErrors.length > 0) {
  printSchemaErrors(schemaErrors, skillPath);
  printCompileReport(reportData);
  process.exit(1);
}

const crossErrors = runCrossChecks([{ path: toRepoRelative(skillPath, rootDir), data: skillData }]);
if (crossErrors.length > 0) {
  printCrossErrors(crossErrors);
  printCompileReport(reportData);
  process.exit(2);
}

console.log(`Compiled SkillSpec: ${toRepoRelative(skillPath, rootDir)}`);
console.log(`Wrote normalized JSON: ${toRepoRelative(normalizedPath, rootDir)}`);
if (reportData) {
  console.log(`Wrote compile report: ${toRepoRelative(resolve(outputDir, "compile-report.json"), rootDir)}`);
}

function parseArgs(argv: string[], repoRoot: string): CliOptions {
  const options: CliOptions = {
    sourcePath: "",
    schemaPath: resolve(repoRoot, "design", "specs", "skill", "skill-spec.schema.json"),
    mode: "strict",
    outDir: resolve(repoRoot, "runtime", "out"),
    modelCmd: process.env.MODEL_CMD ?? "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--source") {
      options.sourcePath = resolve(repoRoot, getArgValue(argv, i, "--source"));
      i += 1;
      continue;
    }
    if (arg === "--schema") {
      options.schemaPath = resolve(repoRoot, getArgValue(argv, i, "--schema"));
      i += 1;
      continue;
    }
    if (arg === "--context") {
      options.contextPath = resolve(repoRoot, getArgValue(argv, i, "--context"));
      i += 1;
      continue;
    }
    if (arg === "--prompt") {
      options.promptPath = resolve(repoRoot, getArgValue(argv, i, "--prompt"));
      i += 1;
      continue;
    }
    if (arg === "--mode") {
      options.mode = parseMode(getArgValue(argv, i, "--mode"));
      i += 1;
      continue;
    }
    if (arg === "--out") {
      options.outDir = resolve(repoRoot, getArgValue(argv, i, "--out"));
      i += 1;
      continue;
    }
    if (arg === "--model-cmd") {
      options.modelCmd = getArgValue(argv, i, "--model-cmd");
      i += 1;
      continue;
    }
  }

  return options;
}

function parseMode(value?: string): Mode {
  if (value === "strict" || value === "trace" || value === "fast") {
    return value;
  }
  console.error(`Invalid --mode '${value ?? ""}'. Use strict, trace, or fast.`);
  process.exit(1);
}

function getArgValue(argv: string[], index: number, name: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`Missing value for ${name}.`);
    process.exit(1);
  }
  return value;
}

function defaultPromptPath(mode: Mode, repoRoot: string): string {
  return resolve(repoRoot, "design", "prompts", `compile-skill.${mode}.md`);
}

function readText(filePath: string): string {
  try {
    return readFileSync(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to read ${filePath}: ${message}`);
    process.exit(1);
  }
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function printSchemaErrors(errors: SchemaError[], skillPath: string): void {
  const relative = toRepoRelative(skillPath, rootDir);
  const sorted = errors
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path) || a.message.localeCompare(b.message));
  console.error("SkillSpec schema validation failed:");
  for (const error of sorted) {
    console.error(`[SCHEMA] ${relative}: ${error.path} ${error.message}`);
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

function printCompileReport(reportData: unknown): void {
  if (!reportData) return;
  console.error("Compile report:");
  console.error(JSON.stringify(reportData, null, 2));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function printUsage(): void {
  console.log("Usage: bun develop/tools/compile/driver.ts --source <source.txt> [options]");
  console.log("\nOptions:");
  console.log("  --schema <path>       Path to SkillSpec schema (default: design/specs/skill/skill-spec.schema.json)");
  console.log("  --context <path>      Optional repo conventions text");
  console.log("  --mode <strict|trace|fast>  Compile mode (default: strict)");
  console.log("  --prompt <path>       Prompt template path (default: design/prompts/compile-skill.<mode>.md)");
  console.log("  --out <dir>           Output directory (default: runtime/out)");
  console.log("  --model-cmd <command> Model invocation (or set MODEL_CMD)");
}
