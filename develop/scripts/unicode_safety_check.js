#!/usr/bin/env bun
"use strict";

const childProcess = require("child_process");

const args = process.argv.slice(2);
const scanStaged = args.includes("--staged");
const scanAll = args.includes("--all") || !scanStaged;

const gitMaxBufferBytes = 64 * 1024 * 1024;

const forbiddenCodepoints = new Set([
  0x034f, // COMBINING GRAPHEME JOINER (invisible)
]);

const decoder = new TextDecoder("utf-8", { fatal: true });

const issues = [];
const fileList = scanStaged ? listStagedFiles() : scanAll ? listTrackedFiles() : [];

for (const filePath of fileList) {
  const content = scanStaged ? readIndexFile(filePath) : readWorkingTreeFile(filePath);
  if (content === null) continue;
  scanText(filePath, content);
}

if (issues.length > 0) {
  console.error("Unicode safety check failed (forbidden hidden/bidi/control characters):");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Unicode safety check passed (${fileList.length} file(s) scanned).`);

function listTrackedFiles() {
  return gitZ("ls-files").filter((entry) => entry.length > 0);
}

function listStagedFiles() {
  return gitZ("diff", "--cached", "--name-only", "--diff-filter=ACMR").filter((entry) => entry.length > 0);
}

function gitZ(...gitArgs) {
  const buffer = childProcess.execFileSync("git", [...gitArgs, "-z"], { encoding: null, maxBuffer: gitMaxBufferBytes });
  return buffer
    .toString("utf8")
    .split("\0")
    .filter((entry) => entry.length > 0);
}

function readIndexFile(repoRelativePath) {
  try {
    const buffer = childProcess.execFileSync("git", ["show", `:${repoRelativePath}`], { encoding: null, maxBuffer: gitMaxBufferBytes });
    return decodeUtf8OrNull(repoRelativePath, buffer);
  } catch (error) {
    issues.push(`${repoRelativePath}: failed to read staged content (${formatError(error)})`);
    return null;
  }
}

function readWorkingTreeFile(repoRelativePath) {
  const fs = require("fs");
  try {
    const buffer = fs.readFileSync(repoRelativePath);
    return decodeUtf8OrNull(repoRelativePath, buffer);
  } catch (error) {
    issues.push(`${repoRelativePath}: failed to read file (${formatError(error)})`);
    return null;
  }
}

function decodeUtf8OrNull(repoRelativePath, buffer) {
  if (isProbablyBinary(buffer)) {
    return null;
  }
  try {
    return decoder.decode(buffer);
  } catch (error) {
    issues.push(`${repoRelativePath}: not valid UTF-8 (${formatError(error)})`);
    return null;
  }
}

function isProbablyBinary(buffer) {
  const max = Math.min(buffer.length, 8000);
  for (let i = 0; i < max; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function scanText(repoRelativePath, text) {
  let line = 1;
  let column = 0;
  for (const ch of text) {
    if (ch === "\n") {
      line++;
      column = 0;
      continue;
    }
    column++;
    if (!isForbiddenChar(ch)) continue;

    const codepoint = ch.codePointAt(0);
    const category = unicodeCategory(ch);
    const name = unicodeName(ch);
    issues.push(`${repoRelativePath}:${line}:${column}: U+${toHex(codepoint)} ${category} ${name}`);
  }
}

function isForbiddenChar(ch) {
  if (ch === "\r" || ch === "\t") return false;
  const codepoint = ch.codePointAt(0);
  if (forbiddenCodepoints.has(codepoint)) return true;

  const category = unicodeCategory(ch);
  if (category === "Cf") return true;
  if (category === "Cc" && (codepoint < 32 || codepoint === 0x7f || (codepoint >= 0x80 && codepoint <= 0x9f))) return true;
  return false;
}

function unicodeCategory(ch) {
  // Not all runtimes expose Intl.Segmenter category APIs; use a small table for known.
  // Fallback: treat unknown as empty category.
  try {
    // Bun exposes Unicode property escapes via regex engine; categorize using a small set.
    if (/\p{Cf}/u.test(ch)) return "Cf";
    if (/\p{Cc}/u.test(ch)) return "Cc";
    return "?";
  } catch {
    return "?";
  }
}

function unicodeName(ch) {
  const codepoint = ch.codePointAt(0);
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

function toHex(codepoint) {
  return codepoint.toString(16).toUpperCase().padStart(4, "0");
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
