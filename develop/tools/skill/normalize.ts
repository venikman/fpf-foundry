#!/usr/bin/env bun
import { writeFileSync } from "fs";
import { resolve } from "path";
import { loadYamlFile, sortKeys, stableStringify } from "./lib/skill-io";

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const inputPath = resolve(args[0]);
const outIndex = args.indexOf("--out");
if (outIndex >= 0 && outIndex + 1 >= args.length) {
  console.error("Missing value for --out.");
  process.exit(1);
}
const outPath = outIndex >= 0 ? resolve(args[outIndex + 1]) : null;

const data = loadYamlFile(inputPath);
const canonical = stableStringify(sortKeys(data));

if (outPath) {
  writeFileSync(outPath, canonical, "utf8");
} else {
  process.stdout.write(canonical);
}

function printUsage(): void {
  console.log("Usage: bun develop/tools/skill/normalize.ts <skill.yaml> [--out <file.json>]");
}
