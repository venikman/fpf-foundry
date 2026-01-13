import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

type LineInfo = {
  sourceName: string;
  lineNumber: number;
  indent: number;
  raw: string;
  content: string;
};

/**
 * Loads and parses a YAML file using the project-restricted YAML subset parser.
 */
export function loadYamlFile(filePath: string): unknown {
  const text = readFileSync(filePath, "utf8");
  return parseYaml(text, filePath);
}

/**
 * Parses YAML text using a strict subset (no tabs, no inline collections, stable indentation).
 */
export function parseYaml(text: string, sourceName: string): unknown {
  const lines = buildLineInfos(text, sourceName);
  const startIndex = nextNonEmptyIndex(lines, 0);
  if (startIndex >= lines.length) {
    throw new Error(`${sourceName}: empty YAML document`);
  }
  const firstIndent = lines[startIndex].indent;
  if (firstIndent !== 0) {
    throw new Error(`${sourceName}:${lines[startIndex].lineNumber} root indentation must be 0`);
  }
  const { value, nextIndex } = parseBlock(lines, startIndex, firstIndent);
  const trailingIndex = nextNonEmptyIndex(lines, nextIndex);
  if (trailingIndex < lines.length) {
    const trailingLine = lines[trailingIndex];
    throw new Error(
      `${sourceName}:${trailingLine.lineNumber} unexpected content after document end`
    );
  }
  return value;
}

/**
 * Recursively sorts object keys to produce deterministic JSON output.
 */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const sorted: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      sorted[key] = sortKeys(entryValue);
    }
    return sorted;
  }
  return value;
}

/**
 * JSON stringifier with stable indentation and trailing newline.
 */
export function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Recursively finds `skill.yaml` files beneath the given directory.
 */
export function findSkillFiles(rootDir: string): string[] {
  const results: string[] = [];
  walk(rootDir, results);
  return results.sort();
}

/**
 * Converts a filesystem path to a repo-relative, POSIX-style path.
 */
export function toRepoRelative(filePath: string, rootDir = process.cwd()): string {
  const rel = relative(rootDir, filePath);
  return rel.length === 0 ? "." : rel.split("\\").join("/");
}

/**
 * Converts a path string to POSIX separators.
 */
export function toPosixPath(pathValue: string): string {
  return pathValue.split("\\").join("/");
}

function walk(currentDir: string, results: string[]): void {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".codex" || entry.name === "runtime") {
      continue;
    }
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
    } else if (entry.isFile() && entry.name === "skill.yaml") {
      results.push(fullPath);
    }
  }
}

function buildLineInfos(text: string, sourceName: string): LineInfo[] {
  const rawLines = text.split(/\r?\n/);
  return rawLines.map((rawLine, index) => {
    const lineNumber = index + 1;
    const indent = countIndent(rawLine, sourceName, lineNumber);
    const rawContent = rawLine.slice(indent);
    const content = stripComments(rawContent).trimEnd();
    return { sourceName, lineNumber, indent, raw: rawLine, content };
  });
}

function countIndent(line: string, sourceName: string, lineNumber: number): number {
  let indent = 0;
  for (const char of line) {
    if (char === " ") {
      indent += 1;
      continue;
    }
    if (char === "\t") {
      throw new Error(`${sourceName}:${lineNumber} tabs are not allowed for indentation`);
    }
    break;
  }
  return indent;
}

function stripComments(value: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "'" && !inDouble) {
      if (inSingle && value[i + 1] === "'") {
        i += 1;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (char === '"' && !inSingle) {
      if (value[i - 1] !== "\\") {
        inDouble = !inDouble;
      }
      continue;
    }
    if (char === "#" && !inSingle && !inDouble) {
      return value.slice(0, i);
    }
  }
  return value;
}

function parseBlock(lines: LineInfo[], startIndex: number, indentLevel: number): { value: unknown; nextIndex: number } {
  const index = nextNonEmptyIndex(lines, startIndex);
  if (index >= lines.length || lines[index].indent < indentLevel) {
    return { value: null, nextIndex: index };
  }
  const isSequence = lines[index].content.trimStart().startsWith("-");
  return isSequence
    ? parseSequence(lines, index, indentLevel)
    : parseMapping(lines, index, indentLevel);
}

function parseSequence(lines: LineInfo[], startIndex: number, indentLevel: number): { value: unknown[]; nextIndex: number } {
  const items: unknown[] = [];
  let index = startIndex;
  while (true) {
    index = nextNonEmptyIndex(lines, index);
    if (index >= lines.length || lines[index].indent < indentLevel) {
      break;
    }
    const line = lines[index];
    if (line.indent !== indentLevel) {
      throw new Error(`${lineInfo(line)} unexpected indent for sequence item`);
    }
    const trimmed = line.content.trimStart();
    if (!trimmed.startsWith("-")) {
      throw new Error(`${lineInfo(line)} expected '-' for sequence item`);
    }
    if (trimmed.length > 1 && trimmed[1] !== " ") {
      throw new Error(`${lineInfo(line)} '-' must be followed by a space or end of line`);
    }
    const remainder = trimmed.length === 1 ? "" : trimmed.slice(2);
    const { value, nextIndex } = parseSequenceItem(lines, index, indentLevel, remainder);
    items.push(value);
    index = nextIndex;
  }
  return { value: items, nextIndex: index };
}

function parseSequenceItem(
  lines: LineInfo[],
  lineIndex: number,
  indentLevel: number,
  remainder: string
): { value: unknown; nextIndex: number } {
  if (remainder.trim().length === 0) {
    const nextIndex = nextNonEmptyIndex(lines, lineIndex + 1);
    if (nextIndex >= lines.length || lines[nextIndex].indent <= indentLevel) {
      return { value: null, nextIndex };
    }
    const { value, nextIndex: afterIndex } = parseBlock(lines, nextIndex, lines[nextIndex].indent);
    return { value, nextIndex: afterIndex };
  }

  const trimmed = remainder.trimEnd();
  if (trimmed === "|" || trimmed === ">") {
    const { value, nextIndex } = parseBlockScalar(lines, lineIndex + 1, indentLevel, trimmed);
    return { value, nextIndex };
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    throw new Error(`${lineInfo(lines[lineIndex])} inline collections are not supported`);
  }

  const inlineMapping = parseInlineMappingCandidate(trimmed);
  if (inlineMapping) {
    const { value, nextIndex } = parseInlineMapping(lines, lineIndex, indentLevel, inlineMapping);
    return { value, nextIndex };
  }

  return { value: parseScalar(trimmed), nextIndex: lineIndex + 1 };
}

function parseInlineMappingCandidate(value: string): { key: string; remainder: string } | null {
  const colonIndex = findUnquotedChar(value, ":");
  if (colonIndex === -1) {
    return null;
  }
  const key = value.slice(0, colonIndex).trim();
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    return null;
  }
  return { key, remainder: value.slice(colonIndex + 1) };
}

function parseInlineMapping(
  lines: LineInfo[],
  lineIndex: number,
  indentLevel: number,
  inline: { key: string; remainder: string }
): { value: Record<string, unknown>; nextIndex: number } {
  const obj: Record<string, unknown> = {};
  const valuePart = inline.remainder.trim();
  if (valuePart.length === 0) {
    const nextIndex = nextNonEmptyIndex(lines, lineIndex + 1);
    if (nextIndex >= lines.length || lines[nextIndex].indent <= indentLevel) {
      obj[inline.key] = null;
      return { value: obj, nextIndex };
    }
    const { value, nextIndex: afterIndex } = parseBlock(lines, nextIndex, lines[nextIndex].indent);
    obj[inline.key] = value;
    const merged = mergeInlineMapping(lines, afterIndex, indentLevel, obj);
    return merged;
  }
  if (valuePart === "|" || valuePart === ">") {
    const { value, nextIndex } = parseBlockScalar(lines, lineIndex + 1, indentLevel, valuePart);
    obj[inline.key] = value;
    const merged = mergeInlineMapping(lines, nextIndex, indentLevel, obj);
    return merged;
  }
  obj[inline.key] = parseScalar(valuePart);
  const merged = mergeInlineMapping(lines, lineIndex + 1, indentLevel, obj);
  return merged;
}

function mergeInlineMapping(
  lines: LineInfo[],
  nextIndex: number,
  indentLevel: number,
  baseObject: Record<string, unknown>
): { value: Record<string, unknown>; nextIndex: number } {
  const followingIndex = nextNonEmptyIndex(lines, nextIndex);
  if (followingIndex >= lines.length || lines[followingIndex].indent <= indentLevel) {
    return { value: baseObject, nextIndex: followingIndex };
  }
  const { value, nextIndex: afterIndex } = parseBlock(lines, followingIndex, lines[followingIndex].indent);
  if (!isPlainObject(value)) {
    throw new Error(`${lineInfo(lines[followingIndex])} inline mapping must expand into an object`);
  }
  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (Object.prototype.hasOwnProperty.call(baseObject, key)) {
      throw new Error(`${lineInfo(lines[followingIndex])} duplicate key '${key}' in mapping`);
    }
    baseObject[key] = entryValue;
  }
  return { value: baseObject, nextIndex: afterIndex };
}

function parseMapping(lines: LineInfo[], startIndex: number, indentLevel: number): { value: Record<string, unknown>; nextIndex: number } {
  const obj: Record<string, unknown> = {};
  let index = startIndex;
  while (true) {
    index = nextNonEmptyIndex(lines, index);
    if (index >= lines.length || lines[index].indent < indentLevel) {
      break;
    }
    const line = lines[index];
    if (line.indent !== indentLevel) {
      throw new Error(`${lineInfo(line)} unexpected indent for mapping`);
    }
    const trimmed = line.content.trim();
    if (trimmed.startsWith("-")) {
      throw new Error(`${lineInfo(line)} unexpected sequence item in mapping`);
    }
    const { key, value } = splitKeyValue(trimmed, line);
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      throw new Error(`${lineInfo(line)} duplicate key '${key}' in mapping`);
    }
    if (value.length === 0) {
      const nextIndex = nextNonEmptyIndex(lines, index + 1);
      if (nextIndex >= lines.length || lines[nextIndex].indent <= indentLevel) {
        obj[key] = null;
        index = nextIndex;
        continue;
      }
      const { value: nestedValue, nextIndex: afterIndex } = parseBlock(
        lines,
        nextIndex,
        lines[nextIndex].indent
      );
      obj[key] = nestedValue;
      index = afterIndex;
      continue;
    }
    if (value === "|" || value === ">") {
      const { value: blockValue, nextIndex } = parseBlockScalar(lines, index + 1, indentLevel, value);
      obj[key] = blockValue;
      index = nextIndex;
      continue;
    }
    obj[key] = parseScalar(value);
    index += 1;
  }
  return { value: obj, nextIndex: index };
}

function parseBlockScalar(
  lines: LineInfo[],
  startIndex: number,
  indentLevel: number,
  style: string
): { value: string; nextIndex: number } {
  const firstContentIndex = nextNonEmptyIndex(lines, startIndex);
  if (firstContentIndex >= lines.length || lines[firstContentIndex].indent <= indentLevel) {
    return { value: "", nextIndex: firstContentIndex };
  }
  const blockIndent = lines[firstContentIndex].indent;
  const collected: string[] = [];
  let index = firstContentIndex;
  while (index < lines.length) {
    const line = lines[index];
    const isEmptyLine = line.raw.trim().length === 0;
    if (!isEmptyLine && line.indent < blockIndent) {
      break;
    }
    collected.push(isEmptyLine ? "" : line.raw.slice(blockIndent));
    index += 1;
  }
  const value = style === ">" ? foldBlockScalar(collected) : collected.join("\n");
  return { value, nextIndex: index };
}

function foldBlockScalar(lines: string[]): string {
  let result = "";
  let previousBlank = false;
  for (const line of lines) {
    if (line.length === 0) {
      result = result.length === 0 ? "\n" : `${result}\n`;
      previousBlank = true;
      continue;
    }
    if (result.length === 0 || previousBlank) {
      result += line;
    } else {
      result += ` ${line}`;
    }
    previousBlank = false;
  }
  return result;
}

function splitKeyValue(content: string, line: LineInfo): { key: string; value: string } {
  const colonIndex = findUnquotedChar(content, ":");
  if (colonIndex === -1) {
    throw new Error(`${lineInfo(line)} missing ':' in mapping entry`);
  }
  const key = content.slice(0, colonIndex).trim();
  const value = content.slice(colonIndex + 1).trim();
  if (key.length === 0) {
    throw new Error(`${lineInfo(line)} empty mapping key`);
  }
  return { key, value };
}

function findUnquotedChar(value: string, target: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "'" && !inDouble) {
      if (inSingle && value[i + 1] === "'") {
        i += 1;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (char === '"' && !inSingle) {
      if (value[i - 1] !== "\\") {
        inDouble = !inDouble;
      }
      continue;
    }
    if (!inSingle && !inDouble && char === target) {
      return i;
    }
  }
  return -1;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) {
    return parseDoubleQuoted(trimmed);
  }
  if (trimmed.startsWith("'")) {
    return parseSingleQuoted(trimmed);
  }
  if (trimmed === "[]") {
    return [];
  }
  if (trimmed === "{}") {
    return {};
  }
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "null" || trimmed === "~") {
    return null;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function parseDoubleQuoted(value: string): string {
  if (!value.endsWith('"')) {
    throw new Error(`Unterminated double-quoted string: ${value}`);
  }
  const inner = value.slice(1, -1);
  let result = "";
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    if (char === "\\" && i + 1 < inner.length) {
      const next = inner[i + 1];
      switch (next) {
        case "n":
          result += "\n";
          break;
        case "r":
          result += "\r";
          break;
        case "t":
          result += "\t";
          break;
        case "\\":
        case '"':
          result += next;
          break;
        default:
          result += next;
          break;
      }
      i += 1;
      continue;
    }
    result += char;
  }
  return result;
}

function parseSingleQuoted(value: string): string {
  if (!value.endsWith("'")) {
    throw new Error(`Unterminated single-quoted string: ${value}`);
  }
  const inner = value.slice(1, -1);
  return inner.replace(/''/g, "'");
}

function nextNonEmptyIndex(lines: LineInfo[], startIndex: number): number {
  let index = startIndex;
  while (index < lines.length) {
    if (lines[index].content.trim().length !== 0) {
      return index;
    }
    index += 1;
  }
  return index;
}

function lineInfo(line: LineInfo): string {
  return `${line.sourceName}:${line.lineNumber}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
