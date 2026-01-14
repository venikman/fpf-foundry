import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

type LineInfo = {
  sourceName: string;
  lineNumber: number;
  indent: number;
  raw: string;
  content: string;
};

export function loadYamlFile(filePath: string): unknown {
  const text = readFileSync(filePath, "utf8");
  return parseYaml(text, filePath);
}

export function loadJsonFile(filePath: string): unknown {
  const text = readFileSync(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${filePath}: invalid JSON (${message})`);
  }
}

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
    throw new Error(`${sourceName}:${trailingLine.lineNumber} unexpected content after document end`);
  }
  return value;
}

export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    const sorted: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      sorted[key] = sortKeys(entryValue);
    }
    return sorted;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function findSkillFiles(rootDir: string): string[] {
  const results: string[] = [];
  walk(rootDir, results);
  return results.sort();
}

export function toRepoRelative(filePath: string, rootDir = process.cwd()): string {
  const rel = relative(rootDir, filePath);
  return rel.length === 0 ? "." : rel.split("\\").join("/");
}

export function toPosixPath(pathValue: string): string {
  return pathValue.split("\\").join("/");
}

function walk(currentDir: string, results: string[]): void {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === ".git" ||
      entry.name === "node_modules" ||
      entry.name === ".codex" ||
      entry.name === ".bun" ||
      entry.name === "dist" ||
      entry.name === "coverage" ||
      entry.name === "runtime"
    ) {
      continue;
    }
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
    } else if (entry.isFile() && (entry.name === "skill.json" || entry.name === "skill.yaml" || entry.name === "skill.yml")) {
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

function isEscaped(value: string, index: number): boolean {
  let backslashCount = 0;
  for (let i = index - 1; i >= 0 && value[i] === "\\"; i -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
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
      if (!isEscaped(value, i)) {
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
  return isSequence ? parseSequence(lines, index, indentLevel) : parseMapping(lines, index, indentLevel);
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

function parseSequenceItem(lines: LineInfo[], lineIndex: number, indentLevel: number, remainder: string): { value: unknown; nextIndex: number } {
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

function parseMapping(lines: LineInfo[], startIndex: number, indentLevel: number): { value: Record<string, unknown>; nextIndex: number } {
  const map: Record<string, unknown> = {};
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

    const { key, remainder } = parseKeyValue(line);
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      throw new Error(`${lineInfo(line)} duplicate key '${key}'`);
    }

    if (remainder.trim().length === 0) {
      const nextIndex = nextNonEmptyIndex(lines, index + 1);
      if (nextIndex >= lines.length || lines[nextIndex].indent <= indentLevel) {
        map[key] = null;
        index = nextIndex;
        continue;
      }
      const { value, nextIndex: afterIndex } = parseBlock(lines, nextIndex, lines[nextIndex].indent);
      map[key] = value;
      index = afterIndex;
      continue;
    }

    const trimmed = remainder.trimEnd();
    if (trimmed === "|" || trimmed === ">") {
      const { value, nextIndex } = parseBlockScalar(lines, index + 1, indentLevel, trimmed);
      map[key] = value;
      index = nextIndex;
      continue;
    }

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      throw new Error(`${lineInfo(line)} inline collections are not supported`);
    }

    map[key] = parseScalar(trimmed);
    index = index + 1;
  }

  return { value: map, nextIndex: index };
}

function parseKeyValue(line: LineInfo): { key: string; remainder: string } {
  const colonIndex = line.content.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`${lineInfo(line)} expected ':' in mapping entry`);
  }
  const key = line.content.slice(0, colonIndex).trim();
  if (key.length === 0) {
    throw new Error(`${lineInfo(line)} empty mapping key`);
  }
  const remainder = line.content.slice(colonIndex + 1);
  return { key, remainder };
}

function parseInlineMappingCandidate(value: string): Array<{ key: string; value: string | null }> | null {
  const colonIndex = value.indexOf(":");
  if (colonIndex === -1) {
    return null;
  }
  const key = value.slice(0, colonIndex).trim();
  if (key.length === 0) {
    return null;
  }
  const remainder = value.slice(colonIndex + 1).trimEnd();
  return [{ key, value: remainder.trim().length === 0 ? null : remainder.trim() }];
}

function parseInlineMapping(
  lines: LineInfo[],
  lineIndex: number,
  indentLevel: number,
  entries: Array<{ key: string; value: string | null }>,
): { value: Record<string, unknown>; nextIndex: number } {
  const map: Record<string, unknown> = {};
  for (const entry of entries) {
    map[entry.key] = entry.value === null ? null : parseScalar(entry.value);
  }

  const nextIndex = nextNonEmptyIndex(lines, lineIndex + 1);
  if (nextIndex >= lines.length || lines[nextIndex].indent <= indentLevel) {
    return { value: map, nextIndex };
  }

  const { value: nestedValue, nextIndex: afterIndex } = parseBlock(lines, nextIndex, lines[nextIndex].indent);
  const lastKey = entries[entries.length - 1]?.key ?? "";
  map[lastKey] = nestedValue;
  return { value: map, nextIndex: afterIndex };
}

function parseBlockScalar(lines: LineInfo[], startIndex: number, parentIndent: number, style: string): { value: string; nextIndex: number } {
  const index = nextNonEmptyIndex(lines, startIndex);
  if (index >= lines.length || lines[index].indent <= parentIndent) {
    return { value: "", nextIndex: index };
  }

  const indentLevel = lines[index].indent;
  const collected: string[] = [];
  let currentIndex = index;
  while (currentIndex < lines.length) {
    const line = lines[currentIndex];
    if (line.indent < indentLevel) {
      break;
    }
    if (line.indent !== indentLevel) {
      throw new Error(`${lineInfo(line)} unexpected indent in block scalar`);
    }
    collected.push(line.raw.slice(indentLevel));
    currentIndex += 1;
  }

  if (style === ">") {
    return { value: foldBlockScalar(collected), nextIndex: currentIndex };
  }
  return { value: collected.join("\n"), nextIndex: currentIndex };
}

function foldBlockScalar(lines: string[]): string {
  const out: string[] = [];
  let buffer = "";
  for (const line of lines) {
    if (line.trim().length === 0) {
      if (buffer.length > 0) {
        out.push(buffer);
        buffer = "";
      }
      out.push("");
      continue;
    }
    if (buffer.length === 0) {
      buffer = line;
    } else {
      buffer = `${buffer} ${line.trimStart()}`;
    }
  }
  if (buffer.length > 0) {
    out.push(buffer);
  }
  return out.join("\n");
}

function parseScalar(value: string): unknown {
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    const num = Number(value);
    if (!Number.isNaN(num)) {
      return num;
    }
  }

  const singleMatch = value.match(/^'(.*)'$/);
  if (singleMatch) {
    return singleMatch[1].replace(/''/g, "'");
  }

  const doubleMatch = value.match(/^"(.*)"$/);
  if (doubleMatch) {
    return parseDoubleQuoted(doubleMatch[1]);
  }

  return value;
}

function parseDoubleQuoted(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char !== "\\") {
      out += char;
      continue;
    }
    const next = value[i + 1];
    if (!next) {
      out += "\\";
      continue;
    }
    i += 1;
    if (next === "n") out += "\n";
    else if (next === "r") out += "\r";
    else if (next === "t") out += "\t";
    else if (next === '"') out += '"';
    else if (next === "\\") out += "\\";
    else out += next;
  }
  return out;
}

function nextNonEmptyIndex(lines: LineInfo[], start: number): number {
  for (let i = start; i < lines.length; i += 1) {
    if (lines[i].content.trim().length > 0) {
      return i;
    }
  }
  return lines.length;
}

function lineInfo(line: LineInfo): string {
  return `${line.sourceName}:${line.lineNumber}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
