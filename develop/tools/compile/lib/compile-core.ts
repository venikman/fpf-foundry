import { spawnSync } from "node:child_process";

/**
 * Compile mode affecting prompt and output parsing rules.
 */
export type Mode = "strict" | "trace" | "fast";

/**
 * Inputs for a single SkillSpec compile invocation.
 */
export type CompileInputs = {
  mode: Mode;
  promptTemplate: string;
  targetSchema: string;
  sourceText: string;
  contextText: string;
  modelCmd: string;
};

/**
 * Parsed results from a single SkillSpec compile invocation.
 */
export type CompileResult = {
  skillSpecJson: string;
  compileReportJson?: string;
  rawOutput: string;
};

type FencedBlock = {
  info: string;
  content: string;
};

/**
 * Expands a prompt template by injecting schema, source text, context, and mode fields.
 */
export function buildPrompt(template: string, inputs: CompileInputs): string {
  return template
    .replaceAll("{{TARGET_SCHEMA}}", inputs.targetSchema)
    .replaceAll("{{SOURCE_TEXT}}", inputs.sourceText)
    .replaceAll("{{CONTEXT}}", inputs.contextText)
    .replaceAll("{{MODE}}", inputs.mode);
}

/**
 * Runs the model command once and parses the fenced-block output into SkillSpec JSON (+ optional report JSON).
 */
export function compileOnce(inputs: CompileInputs): CompileResult {
  const prompt = buildPrompt(inputs.promptTemplate, inputs);
  const rawOutput = runModel(inputs.modelCmd, prompt);
  const { skillSpecJson, compileReportJson } = parseOutput(rawOutput, inputs.mode);
  return { skillSpecJson, compileReportJson, rawOutput };
}

function parseCommandLine(commandLine: string): { command: string; args: string[] } {
  const trimmed = commandLine.trim();
  if (trimmed.length === 0) {
    throw new Error("Model command is empty.");
  }

  const tokens: string[] = [];
  let current = "";
  let tokenStarted = false;
  let inSingle = false;
  let inDouble = false;
  let escaping = false;

  const pushToken = () => {
    if (!tokenStarted) return;
    tokens.push(current);
    current = "";
    tokenStarted = false;
  };

  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (escaping) {
      tokenStarted = true;
      current += ch;
      escaping = false;
      continue;
    }
    if (!inSingle && ch === "\\") {
      tokenStarted = true;
      escaping = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      tokenStarted = true;
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      tokenStarted = true;
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && /\s/.test(ch)) {
      pushToken();
      continue;
    }
    tokenStarted = true;
    current += ch;
  }

  if (escaping) {
    throw new Error("Model command has a trailing escape character.");
  }
  if (inSingle || inDouble) {
    throw new Error("Model command has an unterminated quote.");
  }
  pushToken();

  if (tokens.length === 0) {
    throw new Error("Model command is empty.");
  }
  return { command: tokens[0], args: tokens.slice(1) };
}

function runModel(modelCmd: string, prompt: string): string {
  const { command, args } = parseCommandLine(modelCmd);
  const result = spawnSync(command, args, {
    input: prompt,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`Model command failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = result.stderr?.toString() ?? "";
    throw new Error(`Model command exited with ${result.status}: ${stderr.trim()}`);
  }
  const stdout = result.stdout?.toString() ?? "";
  if (stdout.trim().length === 0) {
    throw new Error("Model command returned empty output.");
  }
  return stdout;
}

function parseOutput(output: string, mode: Mode): { skillSpecJson: string; compileReportJson?: string } {
  const { blocks, outside } = extractFencedBlocks(output);
  if (outside.trim().length > 0) {
    throw new Error("Model output contains text outside fenced blocks.");
  }

  if (mode === "fast") {
    if (blocks.length !== 1) {
      throw new Error("Fast mode requires exactly one fenced block.");
    }
    const first = blocks[0];
    if (!isJsonInfo(first.info)) {
      throw new Error("Fast mode requires the fenced block to be tagged as json.");
    }
    return { skillSpecJson: first.content };
  }

  if (blocks.length !== 2) {
    throw new Error("Strict/trace mode requires exactly two fenced blocks.");
  }

  const skillBlock = blocks[0];
  const jsonBlock = blocks[1];
  if (!isJsonInfo(skillBlock.info)) {
    throw new Error("First fenced block must be tagged as json.");
  }
  if (!isJsonInfo(jsonBlock.info)) {
    throw new Error("Second fenced block must be tagged as json.");
  }
  const reportJson = jsonBlock.content.trim();
  if (reportJson.length === 0) {
    throw new Error("compile-report.json block is empty.");
  }
  try {
    JSON.parse(reportJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`compile-report.json is not valid JSON: ${message}`);
  }

  return { skillSpecJson: skillBlock.content, compileReportJson: reportJson };
}

function extractFencedBlocks(output: string): { blocks: FencedBlock[]; outside: string } {
  const lines = output.split(/\r?\n/);
  const blocks: FencedBlock[] = [];
  const outside: string[] = [];
  let inBlock = false;
  let info = "";
  let buffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inBlock && trimmed.startsWith("```")) {
      inBlock = true;
      info = trimmed.slice(3).trim();
      buffer = [];
      continue;
    }
    if (inBlock && trimmed === "```") {
      blocks.push({ info, content: buffer.join("\n") });
      inBlock = false;
      info = "";
      buffer = [];
      continue;
    }
    if (inBlock) {
      buffer.push(line);
    } else {
      outside.push(line);
    }
  }

  if (inBlock) {
    throw new Error("Model output has an unclosed fenced block.");
  }

  return { blocks, outside: outside.join("\n") };
}

function isJsonInfo(info: string): boolean {
  return info.trim().toLowerCase() === "json";
}
