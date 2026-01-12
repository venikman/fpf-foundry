import { spawnSync } from "child_process";

export type Mode = "strict" | "trace" | "fast";

export type CompileInputs = {
  mode: Mode;
  promptTemplate: string;
  targetSchema: string;
  sourceText: string;
  contextText: string;
  modelCmd: string;
};

export type CompileResult = {
  skillYaml: string;
  compileReportJson?: string;
  rawOutput: string;
};

type FencedBlock = {
  info: string;
  content: string;
};

export function buildPrompt(template: string, inputs: CompileInputs): string {
  return template
    .replaceAll("{{TARGET_SCHEMA}}", inputs.targetSchema)
    .replaceAll("{{SOURCE_TEXT}}", inputs.sourceText)
    .replaceAll("{{CONTEXT}}", inputs.contextText)
    .replaceAll("{{MODE}}", inputs.mode);
}

export function compileOnce(inputs: CompileInputs): CompileResult {
  const prompt = buildPrompt(inputs.promptTemplate, inputs);
  const rawOutput = runModel(inputs.modelCmd, prompt);
  const { skillYaml, compileReportJson } = parseOutput(rawOutput, inputs.mode);
  return { skillYaml, compileReportJson, rawOutput };
}

function runModel(modelCmd: string, prompt: string): string {
  const result = spawnSync(modelCmd, {
    shell: true,
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

function parseOutput(output: string, mode: Mode): { skillYaml: string; compileReportJson?: string } {
  const { blocks, outside } = extractFencedBlocks(output);
  if (outside.trim().length > 0) {
    throw new Error("Model output contains text outside fenced blocks.");
  }

  if (mode === "fast") {
    if (blocks.length !== 1) {
      throw new Error("Fast mode requires exactly one fenced block.");
    }
    const first = blocks[0];
    if (!isYamlInfo(first.info)) {
      throw new Error("Fast mode requires the fenced block to be tagged as yaml.");
    }
    return { skillYaml: first.content };
  }

  if (blocks.length !== 2) {
    throw new Error("Strict/trace mode requires exactly two fenced blocks.");
  }

  const yamlBlock = blocks[0];
  const jsonBlock = blocks[1];
  if (!isYamlInfo(yamlBlock.info)) {
    throw new Error("First fenced block must be tagged as yaml.");
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

  return { skillYaml: yamlBlock.content, compileReportJson: reportJson };
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

function isYamlInfo(info: string): boolean {
  const tag = info.trim().toLowerCase();
  return tag === "yaml" || tag === "yml";
}

function isJsonInfo(info: string): boolean {
  return info.trim().toLowerCase() === "json";
}
