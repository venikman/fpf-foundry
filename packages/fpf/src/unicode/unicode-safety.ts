import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";

const forbiddenCodepoints = new Set([0x034f]);

const decoder = new TextDecoder("utf-8", { fatal: true });

export type UnicodeIssue = {
  file: string;
  message: string;
};

export function scanUnicodeSafety(rootDir: string): UnicodeIssue[] {
  const issues: UnicodeIssue[] = [];
  const files = listCandidateFiles(rootDir);

  for (const filePath of files) {
    let buffer: Buffer;
    try {
      buffer = readFileSync(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({ file: toRepoRelative(rootDir, filePath), message: `failed to read file (${message})` });
      continue;
    }
    if (isProbablyBinary(buffer)) continue;

    let content: string;
    try {
      content = decoder.decode(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({ file: toRepoRelative(rootDir, filePath), message: `not valid UTF-8 (${message})` });
      continue;
    }
    scanText(rootDir, filePath, content, issues);
  }

  return issues;
}

function listCandidateFiles(rootDir: string): string[] {
  const results: string[] = [];
  walk(rootDir, rootDir, results);
  return results.sort();
}

function walk(rootDir: string, dir: string, results: string[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".bun" || entry.name === "dist" || entry.name === "coverage") {
      continue;
    }
    const fullPath = join(dir, entry.name);
    const rel = toPosix(relative(rootDir, fullPath));
    if (rel === "runtime/out" || rel.startsWith("runtime/out/") || rel === "runtime/contexts" || rel.startsWith("runtime/contexts/")) {
      continue;
    }
    if (rel === "runtime/skills/index.json") {
      continue;
    }
    if (entry.isDirectory()) {
      walk(rootDir, fullPath, results);
      continue;
    }
    if (entry.isFile()) {
      results.push(fullPath);
    }
  }
}

function isProbablyBinary(buffer: Buffer): boolean {
  const max = Math.min(buffer.length, 8000);
  for (let i = 0; i < max; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function scanText(rootDir: string, filePath: string, text: string, issues: UnicodeIssue[]): void {
  let line = 1;
  let column = 0;
  for (const ch of text) {
    if (ch === "\n") {
      line += 1;
      column = 0;
      continue;
    }
    column += 1;
    if (!isForbiddenChar(ch)) continue;

    const codepoint = ch.codePointAt(0) ?? 0;
    const category = unicodeCategory(ch);
    const name = unicodeName(ch);
    issues.push({ file: toRepoRelative(rootDir, filePath), message: `${line}:${column}: U+${toHex(codepoint)} ${category} ${name}` });
  }
}

function isForbiddenChar(ch: string): boolean {
  if (ch === "\r" || ch === "\t") return false;
  const codepoint = ch.codePointAt(0) ?? 0;
  if (forbiddenCodepoints.has(codepoint)) return true;

  const category = unicodeCategory(ch);
  if (category === "Cf") return true;
  if (category === "Cc" && (codepoint < 32 || codepoint === 0x7f || (codepoint >= 0x80 && codepoint <= 0x9f))) return true;
  return false;
}

function unicodeCategory(ch: string): string {
  try {
    if (/\p{Cf}/u.test(ch)) return "Cf";
    if (/\p{Cc}/u.test(ch)) return "Cc";
    return "?";
  } catch {
    return "?";
  }
}

function unicodeName(ch: string): string {
  const codepoint = ch.codePointAt(0) ?? 0;
  if (codepoint === 0x00ad) return "SOFT HYPHEN";
  if (codepoint === 0x034f) return "COMBINING GRAPHEME JOINER";
  if (codepoint === 0x061c) return "ARABIC LETTER MARK";
  if (codepoint === 0x200e) return "LEFT-TO-RIGHT MARK";
  if (codepoint === 0x200f) return "RIGHT-TO-LEFT MARK";
  if (codepoint >= 0x202a && codepoint <= 0x202e) return "BIDI EMBEDDING/OVERRIDE";
  if (codepoint >= 0x2066 && codepoint <= 0x2069) return "BIDI ISOLATE";
  if (codepoint >= 0x200b && codepoint <= 0x200d) return "ZERO WIDTH (SPACE/JOINER)";
  if (codepoint === 0xfeff) return "ZERO WIDTH NO-BREAK SPACE (BOM)";
  return "UNNAMED";
}

function toHex(codepoint: number): string {
  return codepoint.toString(16).toUpperCase().padStart(4, "0");
}

function toRepoRelative(rootDir: string, filePath: string): string {
  return toPosix(relative(rootDir, filePath));
}

function toPosix(filePath: string): string {
  return filePath.split(sep).join("/");
}
