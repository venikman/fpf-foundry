import { parseArgs } from "util";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";

/**
 * Strict kebab-case with fpf- prefix.
 */
function slugify(text: string): string {
  let clean = text.toLowerCase();
  clean = clean.replace(/[^a-z0-9]+/g, "-");
  clean = clean.replace(/^-+|-+$/g, "");

  if (clean.startsWith("fpf-")) {
    return clean;
  }
  return `fpf-${clean}`;
}

async function parseSpec(specPath: string, patternId: string): Promise<[string, string] | [null, null]> {
  let content: string;
  try {
    content = await readFile(specPath, "utf8");
  } catch (e) {
    console.error(`Error reading spec file: ${e}`);
    return [null, null];
  }

  const lines = content.split("\n");
  let startLine = -1;
  let endLine = -1;
  let title = "";

  // Regex for "## ID - Title"
  // Extract ID (escaped)
  const escapedId = patternId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerRegex = new RegExp(`^##\\s+${escapedId}\\s+-\\s+(.+)$`);
  const footerRegex = new RegExp(`^###\\s+${escapedId}:End`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = headerRegex.exec(line);
    if (match) {
      startLine = i;
      title = match[1].split("(")[0].trim(); // remove (informative)
      continue;
    }

    if (startLine !== -1 && footerRegex.test(line)) {
      endLine = i;
      break;
    }
  }

  if (startLine === -1 || endLine === -1) {
    return [null, null];
  }

  const patternContent = lines.slice(startLine, endLine + 1).join("\n") + "\n";
  return [title, patternContent];
}

async function generateSkill(title: string, content: string, fpfId: string, outputDir: string) {
  const slug = slugify(title);
  const skillDir = join(outputDir, slug);

  await mkdir(skillDir, { recursive: true });

  const description = `FPF Pattern ${fpfId}: ${title}`;

  const skillSpec = buildSkillSpecJson(slug, title, fpfId);

  const yamlFrontmatter = `---
name: ${slug}
description: ${description}
license: Apache-2.0
metadata:
  fpf_id: ${fpfId}
  fpf_title: "${title}"
allowed-tools: []
---

`;

  await writeFile(join(skillDir, "SKILL.md"), yamlFrontmatter + content);
  await writeFile(join(skillDir, "skill.json"), skillSpec);
  console.log(`Generated ${slug} in ${skillDir}`);
}

function buildSkillSpecJson(slug: string, title: string, fpfId: string): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const summary = `FPF Pattern ${fpfId}: ${title}.`;
  const goal = `Apply pattern ${fpfId} (${title}).`;

  const spec = {
    schema_version: "0.1.0",
    id: slug,
    name: title,
    summary,
    intent: {
      goal,
      non_goals: ["UNKNOWN"],
    },
    inputs: [],
    outputs: [],
    procedure: [
      {
        step_id: "step-define",
        instruction: "Define the procedure steps from the pattern text.",
      },
    ],
    constraints: {
      safety: ["UNKNOWN"],
      privacy: ["UNKNOWN"],
      licensing: ["UNKNOWN"],
    },
    dependencies: {
      tools: [],
      skills: [],
    },
    eval: {
      acceptance_criteria: ["UNKNOWN", "UNKNOWN", "UNKNOWN"],
      tests: [
        { name: "basic", input_fixture: {}, expected: {} },
        { name: "basic-2", input_fixture: {}, expected: {} },
      ],
    },
    version: "0.1.0",
    metadata: {
      tags: ["pattern"],
      authors: ["UNKNOWN"],
      created: dateStr,
      updated: dateStr,
    },
    failure_modes: ["UNKNOWN: intent.non_goals", "UNKNOWN: constraints.safety", "UNKNOWN: constraints.privacy", "UNKNOWN: constraints.licensing"],
  };

  return JSON.stringify(spec, null, 2) + "\n";
}

async function main() {
  const args = parseArgs({
    args: Bun.argv,
    options: {
      spec: { type: "string" },
      pattern: { type: "string" },
      output: { type: "string" },
    },
    strict: true,
    allowPositionals: true,
  });

  if (!args.values.spec || !args.values.pattern || !args.values.output) {
    console.error("Usage: bun run generate_pattern.ts --spec <path> --pattern <id> --output <path>");
    process.exit(1);
  }

  const [title, content] = await parseSpec(args.values.spec, args.values.pattern);

  if (!content) {
    console.error(`Pattern ${args.values.pattern} not found in ${args.values.spec}`);
    process.exit(1);
  }

  if (title && content) {
    await generateSkill(title, content, args.values.pattern, args.values.output);
  }
}

main();
