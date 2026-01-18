#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, basename, extname } from "node:path";
import { spawnSync } from "node:child_process";
import { sortKeys, stableStringify } from "../skill/lib/skill-io";

const rootDir = process.cwd();
const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const options = parseArgs(args, rootDir);
const modelCmd = options.modelCmd || process.env.MODEL_CMD || "";
if (!modelCmd) {
  console.error("Missing model command. Use --model-cmd or set MODEL_CMD.");
  printUsage();
  process.exit(1);
}

const sources = options.sourcePaths.length > 0 ? options.sourcePaths : listSources(options.sourcesDir);
if (sources.length === 0) {
  console.error("No source files found.");
  process.exit(1);
}

let failures = 0;
for (const sourcePath of sources) {
  const baseName = basename(sourcePath, extname(sourcePath));
  const expectedPath = resolve(options.expectedDir, `${baseName}.skill.json`);
  if (!existsSync(expectedPath)) {
    console.error(`Missing expected output: ${expectedPath}`);
    failures += 1;
    continue;
  }

  const runResult = runCompile(sourcePath, options.mode, options.outDir, modelCmd, options.schemaPath, options.contextPath);
  if (!runResult) {
    failures += 1;
    continue;
  }

  let expectedObj: unknown;
  try {
    expectedObj = JSON.parse(readFileSync(expectedPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to parse expected JSON: ${expectedPath} (${message})`);
    failures += 1;
    continue;
  }
  const expectedCanonical = stableStringify(sortKeys(expectedObj));
  const expectedId = (expectedObj as Record<string, unknown>).id;
  if (typeof expectedId !== "string" || expectedId.trim().length === 0) {
    console.error(`Expected output missing id: ${expectedPath}`);
    failures += 1;
    continue;
  }

  const actualJsonPath = resolve(options.outDir, expectedId, "skill.json");
  let actualObj: unknown;
  try {
    if (existsSync(actualJsonPath)) {
      actualObj = JSON.parse(readFileSync(actualJsonPath, "utf8"));
    } else {
      console.error(`Missing compile output: ${actualJsonPath}`);
      failures += 1;
      continue;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to parse compile output for ${baseName}: ${message}`);
    failures += 1;
    continue;
  }
  const actualCanonical = stableStringify(sortKeys(actualObj));

  if (actualCanonical !== expectedCanonical) {
    console.error(`Golden mismatch for ${baseName}.`);
    failures += 1;
  } else {
    console.log(`Golden match for ${baseName}.`);
  }
}

if (failures > 0) {
  console.error(`Compile regression failed (${failures} mismatch(es)).`);
  process.exit(1);
}

console.log("Compile regression passed.");

function runCompile(sourcePath: string, mode: string, outDir: string, modelCmd: string, schemaPath?: string, contextPath?: string): boolean {
  const cmd = ["bun", "develop/tools/compile/driver.ts", "--source", sourcePath, "--mode", mode, "--out", outDir, "--model-cmd", modelCmd];
  if (schemaPath) {
    cmd.push("--schema", schemaPath);
  }
  if (contextPath) {
    cmd.push("--context", contextPath);
  }

  const result = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`Compile failed for ${sourcePath}.`);
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    return false;
  }
  return true;
}

function listSources(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((entry) => entry.endsWith(".txt"))
    .map((entry) => resolve(dir, entry))
    .sort();
}

type CliOptions = {
  sourcesDir: string;
  expectedDir: string;
  outDir: string;
  mode: ModeString;
  modelCmd?: string;
  schemaPath?: string;
  contextPath?: string;
  sourcePaths: string[];
};

type ModeString = "strict" | "trace" | "fast";

function parseArgs(argv: string[], repoRoot: string): CliOptions {
  const options: CliOptions = {
    sourcesDir: resolve(repoRoot, "design", "examples", "compile", "sources"),
    expectedDir: resolve(repoRoot, "design", "examples", "compile", "expected"),
    outDir: resolve(repoRoot, "runtime", "out", "compile"),
    mode: "strict",
    sourcePaths: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--sources-dir") {
      options.sourcesDir = resolve(repoRoot, getArgValue(argv, i, "--sources-dir"));
      i += 1;
      continue;
    }
    if (arg === "--expected-dir") {
      options.expectedDir = resolve(repoRoot, getArgValue(argv, i, "--expected-dir"));
      i += 1;
      continue;
    }
    if (arg === "--out") {
      options.outDir = resolve(repoRoot, getArgValue(argv, i, "--out"));
      i += 1;
      continue;
    }
    if (arg === "--mode") {
      options.mode = parseMode(getArgValue(argv, i, "--mode"));
      i += 1;
      continue;
    }
    if (arg === "--model-cmd") {
      options.modelCmd = getArgValue(argv, i, "--model-cmd");
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
    if (arg === "--source") {
      options.sourcePaths.push(resolve(repoRoot, getArgValue(argv, i, "--source")));
      i += 1;
    }
  }

  return options;
}

function parseMode(value?: string): ModeString {
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

function printUsage(): void {
  console.log("Usage: bun develop/tools/compile/verify.ts [options]");
  console.log("\nOptions:");
  console.log("  --sources-dir <dir>   Source text directory (default: design/examples/compile/sources)");
  console.log("  --expected-dir <dir>  Expected JSON directory (default: design/examples/compile/expected)");
  console.log("  --out <dir>           Output directory (default: runtime/out/compile)");
  console.log("  --mode <strict|trace|fast>  Compile mode (default: strict)");
  console.log("  --model-cmd <command> Model invocation (or set MODEL_CMD)");
  console.log("  --schema <path>       Optional schema override");
  console.log("  --context <path>      Optional context file");
  console.log("  --source <file>       Compile a single source (repeatable)");
}
