#!/usr/bin/env bun
import { chmodSync, cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const repoRoot = process.cwd();
const srcRoot = join(repoRoot, "packages", "fpf");
const outRoot = join(repoRoot, "dist", "npm", "fpf");

if (!existsSync(srcRoot)) {
  console.error(`Missing source package: ${srcRoot}`);
  process.exit(1);
}

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

copyFile("package.json");
copyFile("README.md");
copyFile("LICENSE");
copyDir("bin");
copyDir("src");
copyDir("templates");

try {
  chmodSync(join(outRoot, "bin", "fpf"), 0o755);
} catch {
  // Best-effort (Windows).
}

console.log(outRoot);

function copyFile(relativePath: string): void {
  const src = join(srcRoot, relativePath);
  const dest = join(outRoot, relativePath);
  cpSync(src, dest, { force: true });
}

function copyDir(relativePath: string): void {
  const src = join(srcRoot, relativePath);
  const dest = join(outRoot, relativePath);
  cpSync(src, dest, { recursive: true, force: true });
}
