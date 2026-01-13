/**
 * Schema validation error describing a JSON path and message.
 */
export type SchemaError = {
  path: string;
  message: string;
};

/**
 * Cross-file validation error (e.g., duplicate IDs, dependency references).
 */
export type CrossCheckError = {
  file: string;
  path: string;
  message: string;
};

/**
 * Loaded SkillSpec document paired with its repo-relative path.
 */
export type SkillDoc = {
  path: string;
  data: Record<string, unknown>;
};

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
const semverPattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const rootRequired = ["schema_version", "id", "name", "summary", "intent", "inputs", "outputs", "procedure", "constraints", "dependencies", "eval", "version", "metadata"];

const rootAllowed = [...rootRequired, "failure_modes", "quality", "provenance"];

/**
 * Validates a SkillSpec document against the project's schema rules.
 *
 * This intentionally enforces an explicit, narrow ruleset aligned to the repository's SkillSpec
 * schema without pulling in a full JSON Schema runtime.
 */
export function validateSchema(data: unknown): SchemaError[] {
  const errors: SchemaError[] = [];
  if (!isPlainObject(data)) {
    errors.push({ path: "$", message: "expected object" });
    return errors;
  }

  const root = data as Record<string, unknown>;
  checkAllowedKeys(root, rootAllowed, "$", errors);
  checkRequiredKeys(root, rootRequired, "$", errors);

  validateConstString(root, "schema_version", "$.schema_version", "0.1.0", errors);
  validatePatternString(root, "id", "$.id", idPattern, "kebab-case or path segment", errors);
  validateString(root, "name", "$.name", errors);
  validateString(root, "summary", "$.summary", errors);
  validateSemver(root, "version", "$.version", errors);

  validateIntent(root.intent, "$.intent", errors);
  validateInputs(root.inputs, "$.inputs", errors);
  validateOutputs(root.outputs, "$.outputs", errors);
  validateProcedure(root.procedure, "$.procedure", errors);
  validateConstraints(root.constraints, "$.constraints", errors);
  validateDependencies(root.dependencies, "$.dependencies", errors);
  validateEval(root.eval, "$.eval", errors);
  validateMetadata(root.metadata, "$.metadata", errors);
  validateFailureModes(root.failure_modes, "$.failure_modes", errors);
  validateQuality(root.quality, "$.quality", errors);
  validateProvenance(root.provenance, "$.provenance", errors);

  return errors;
}

/**
 * Runs cross-file checks that require a multi-skill view (duplicates, references, ordering constraints).
 */
export function runCrossChecks(skills: SkillDoc[]): CrossCheckError[] {
  const errors: CrossCheckError[] = [];
  const idMap = new Map<string, SkillDoc[]>();

  for (const skill of skills) {
    const id = skill.data.id;
    if (typeof id === "string") {
      const list = idMap.get(id) ?? [];
      list.push(skill);
      idMap.set(id, list);
    }
  }

  for (const [id, entries] of idMap.entries()) {
    if (entries.length > 1) {
      for (const entry of entries) {
        const otherLocations = entries
          .filter((other) => other.path !== entry.path)
          .map((other) => other.path)
          .join(", ");
        errors.push({
          file: entry.path,
          path: "$.id",
          message: otherLocations.length > 0 ? `duplicate id '${id}' also defined in ${otherLocations}` : `duplicate id '${id}'`,
        });
      }
    }
  }

  for (const skill of skills) {
    checkStepIdUniqueness(skill, errors);
    checkEvalTestsNonEmpty(skill, errors);
    checkUpdatedAfterCreated(skill, errors);
    checkDependencyRefs(skill, idMap, errors);
    checkNonEmptyRequiredStrings(skill, errors);
  }

  return errors;
}

function validateIntent(value: unknown, path: string, errors: SchemaError[]): void {
  const intent = ensureObject(value, path, errors);
  if (!intent) return;
  checkAllowedKeys(intent, ["goal", "non_goals"], path, errors);
  checkRequiredKeys(intent, ["goal", "non_goals"], path, errors);
  validateString(intent, "goal", `${path}.goal`, errors);
  validateStringArray(intent.non_goals, `${path}.non_goals`, errors);
}

function validateInputs(value: unknown, path: string, errors: SchemaError[]): void {
  const inputs = ensureArray(value, path, errors);
  if (!inputs) return;
  inputs.forEach((entry, index) => validateInput(entry, `${path}[${index}]`, errors));
}

function validateInput(value: unknown, path: string, errors: SchemaError[]): void {
  const input = ensureObject(value, path, errors);
  if (!input) return;
  checkAllowedKeys(input, ["name", "type", "description", "required", "examples"], path, errors);
  checkRequiredKeys(input, ["name", "type", "description", "required"], path, errors);
  validateString(input, "name", `${path}.name`, errors);
  validateString(input, "type", `${path}.type`, errors);
  validateString(input, "description", `${path}.description`, errors);
  validateBoolean(input, "required", `${path}.required`, errors);
  validateStringArray(input.examples, `${path}.examples`, errors, true);
}

function validateOutputs(value: unknown, path: string, errors: SchemaError[]): void {
  const outputs = ensureArray(value, path, errors);
  if (!outputs) return;
  outputs.forEach((entry, index) => validateOutput(entry, `${path}[${index}]`, errors));
}

function validateOutput(value: unknown, path: string, errors: SchemaError[]): void {
  const output = ensureObject(value, path, errors);
  if (!output) return;
  checkAllowedKeys(output, ["name", "type", "description", "examples"], path, errors);
  checkRequiredKeys(output, ["name", "type", "description"], path, errors);
  validateString(output, "name", `${path}.name`, errors);
  validateString(output, "type", `${path}.type`, errors);
  validateString(output, "description", `${path}.description`, errors);
  validateStringArray(output.examples, `${path}.examples`, errors, true);
}

function validateProcedure(value: unknown, path: string, errors: SchemaError[]): void {
  const procedure = ensureArray(value, path, errors);
  if (!procedure) return;
  procedure.forEach((entry, index) => validateProcedureStep(entry, `${path}[${index}]`, errors));
}

function validateProcedureStep(value: unknown, path: string, errors: SchemaError[]): void {
  const step = ensureObject(value, path, errors);
  if (!step) return;
  checkAllowedKeys(step, ["step_id", "instruction", "checks"], path, errors);
  checkRequiredKeys(step, ["step_id", "instruction"], path, errors);
  validateString(step, "step_id", `${path}.step_id`, errors);
  validateString(step, "instruction", `${path}.instruction`, errors);
  validateStringArray(step.checks, `${path}.checks`, errors, true);
}

function validateConstraints(value: unknown, path: string, errors: SchemaError[]): void {
  const constraints = ensureObject(value, path, errors);
  if (!constraints) return;
  checkAllowedKeys(constraints, ["safety", "privacy", "licensing"], path, errors);
  checkRequiredKeys(constraints, ["safety", "privacy", "licensing"], path, errors);
  validateStringArray(constraints.safety, `${path}.safety`, errors);
  validateStringArray(constraints.privacy, `${path}.privacy`, errors);
  validateStringArray(constraints.licensing, `${path}.licensing`, errors);
}

function validateDependencies(value: unknown, path: string, errors: SchemaError[]): void {
  const deps = ensureObject(value, path, errors);
  if (!deps) return;
  checkAllowedKeys(deps, ["tools", "skills"], path, errors);
  checkRequiredKeys(deps, ["tools", "skills"], path, errors);
  validateStringArray(deps.tools, `${path}.tools`, errors);
  validateStringArray(deps.skills, `${path}.skills`, errors);
}

function validateEval(value: unknown, path: string, errors: SchemaError[]): void {
  const evalBlock = ensureObject(value, path, errors);
  if (!evalBlock) return;
  checkAllowedKeys(evalBlock, ["acceptance_criteria", "tests"], path, errors);
  checkRequiredKeys(evalBlock, ["acceptance_criteria", "tests"], path, errors);
  validateStringArray(evalBlock.acceptance_criteria, `${path}.acceptance_criteria`, errors);
  const tests = ensureArray(evalBlock.tests, `${path}.tests`, errors);
  if (!tests) return;
  tests.forEach((entry, index) => validateTest(entry, `${path}.tests[${index}]`, errors));
}

function validateTest(value: unknown, path: string, errors: SchemaError[]): void {
  const test = ensureObject(value, path, errors);
  if (!test) return;
  checkAllowedKeys(test, ["name", "input_fixture", "expected", "notes"], path, errors);
  checkRequiredKeys(test, ["name", "input_fixture", "expected"], path, errors);
  validateString(test, "name", `${path}.name`, errors);
  validateObject(test, "input_fixture", `${path}.input_fixture`, errors);
  validateObject(test, "expected", `${path}.expected`, errors);
  validateString(test, "notes", `${path}.notes`, errors, true);
}

function validateMetadata(value: unknown, path: string, errors: SchemaError[]): void {
  const metadata = ensureObject(value, path, errors);
  if (!metadata) return;
  checkAllowedKeys(metadata, ["tags", "authors", "created", "updated"], path, errors);
  checkRequiredKeys(metadata, ["tags", "authors", "created", "updated"], path, errors);
  validateStringArray(metadata.tags, `${path}.tags`, errors);
  validateStringArray(metadata.authors, `${path}.authors`, errors);
  validateDate(metadata, "created", `${path}.created`, errors);
  validateDate(metadata, "updated", `${path}.updated`, errors);
}

function validateFailureModes(value: unknown, path: string, errors: SchemaError[]): void {
  if (value === undefined) return;
  validateStringArray(value, path, errors);
}

function validateQuality(value: unknown, path: string, errors: SchemaError[]): void {
  if (value === undefined) return;
  const quality = ensureObject(value, path, errors);
  if (!quality) return;
  checkAllowedKeys(quality, ["precision_priority", "latency_priority", "cost_priority"], path, errors);
  checkRequiredKeys(quality, ["precision_priority", "latency_priority", "cost_priority"], path, errors);
  validateNumberRange(quality, "precision_priority", `${path}.precision_priority`, errors, 0, 1);
  validateNumberRange(quality, "latency_priority", `${path}.latency_priority`, errors, 0, 1);
  validateNumberRange(quality, "cost_priority", `${path}.cost_priority`, errors, 0, 1);
}

function validateProvenance(value: unknown, path: string, errors: SchemaError[]): void {
  if (value === undefined) return;
  const provenance = ensureObject(value, path, errors);
  if (!provenance) return;
  checkAllowedKeys(provenance, ["source_type", "source_ref", "compiled_by", "compiled_at", "field_evidence"], path, errors);
  if (provenance.source_type !== undefined) {
    validateEnum(provenance, "source_type", `${path}.source_type`, ["article", "doc", "chat", "other"], errors);
  }
  validateString(provenance, "source_ref", `${path}.source_ref`, errors, true);
  validateString(provenance, "compiled_by", `${path}.compiled_by`, errors, true);
  validateDateTime(provenance, "compiled_at", `${path}.compiled_at`, errors, true);
  if (provenance.field_evidence !== undefined) {
    const fieldEvidence = ensureArray(provenance.field_evidence, `${path}.field_evidence`, errors);
    if (!fieldEvidence) return;
    fieldEvidence.forEach((entry, index) => validateFieldEvidence(entry, `${path}.field_evidence[${index}]`, errors));
  }
}

function validateFieldEvidence(value: unknown, path: string, errors: SchemaError[]): void {
  const evidence = ensureObject(value, path, errors);
  if (!evidence) return;
  checkAllowedKeys(evidence, ["json_path", "quote"], path, errors);
  checkRequiredKeys(evidence, ["json_path", "quote"], path, errors);
  validateString(evidence, "json_path", `${path}.json_path`, errors);
  validateString(evidence, "quote", `${path}.quote`, errors);
}

function validateConstString(obj: Record<string, unknown>, key: string, path: string, expected: string, errors: SchemaError[]): void {
  if (!(key in obj)) return;
  if (typeof obj[key] !== "string") {
    errors.push({ path, message: "expected string" });
    return;
  }
  if (obj[key] !== expected) {
    errors.push({ path, message: `must equal "${expected}"` });
  }
}

function validatePatternString(obj: Record<string, unknown>, key: string, path: string, pattern: RegExp, label: string, errors: SchemaError[]): void {
  if (!(key in obj)) return;
  if (typeof obj[key] !== "string") {
    errors.push({ path, message: "expected string" });
    return;
  }
  if (!pattern.test(obj[key] as string)) {
    errors.push({ path, message: `does not match ${label} pattern` });
  }
}

function validateSemver(obj: Record<string, unknown>, key: string, path: string, errors: SchemaError[]): void {
  if (!(key in obj)) return;
  if (typeof obj[key] !== "string") {
    errors.push({ path, message: "expected string" });
    return;
  }
  if (!semverPattern.test(obj[key] as string)) {
    errors.push({ path, message: "invalid semver format" });
  }
}

function validateString(obj: Record<string, unknown>, key: string, path: string, errors: SchemaError[], _optional = false): void {
  if (!(key in obj)) return;
  if (typeof obj[key] !== "string") {
    errors.push({ path, message: "expected string" });
  }
}

function validateBoolean(obj: Record<string, unknown>, key: string, path: string, errors: SchemaError[]): void {
  if (!(key in obj)) return;
  if (typeof obj[key] !== "boolean") {
    errors.push({ path, message: "expected boolean" });
  }
}

function validateNumberRange(obj: Record<string, unknown>, key: string, path: string, errors: SchemaError[], min: number, max: number): void {
  if (!(key in obj)) return;
  const value = obj[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    errors.push({ path, message: "expected number" });
    return;
  }
  if (value < min || value > max) {
    errors.push({ path, message: `expected number between ${min} and ${max}` });
  }
}

function validateEnum(obj: Record<string, unknown>, key: string, path: string, allowed: string[], errors: SchemaError[]): void {
  if (!(key in obj)) return;
  if (typeof obj[key] !== "string") {
    errors.push({ path, message: "expected string" });
    return;
  }
  if (!allowed.includes(obj[key] as string)) {
    errors.push({ path, message: `must be one of: ${allowed.join(", ")}` });
  }
}

function validateDate(obj: Record<string, unknown>, key: string, path: string, errors: SchemaError[], _optional = false): void {
  if (!(key in obj)) return;
  if (typeof obj[key] !== "string") {
    errors.push({ path, message: "expected string" });
    return;
  }
  if (!isIsoDate(obj[key] as string)) {
    errors.push({ path, message: "invalid date format (YYYY-MM-DD)" });
  }
}

function validateDateTime(obj: Record<string, unknown>, key: string, path: string, errors: SchemaError[], _optional = false): void {
  if (!(key in obj)) return;
  if (typeof obj[key] !== "string") {
    errors.push({ path, message: "expected string" });
    return;
  }
  if (!isIsoDateTime(obj[key] as string)) {
    errors.push({ path, message: "invalid date-time format" });
  }
}

function validateStringArray(value: unknown, path: string, errors: SchemaError[], _optional = false): void {
  if (value === undefined) return;
  const arrayValue = ensureArray(value, path, errors);
  if (!arrayValue) return;
  arrayValue.forEach((entry, index) => {
    if (typeof entry !== "string") {
      errors.push({ path: `${path}[${index}]`, message: "expected string" });
    }
  });
}

function validateObject(obj: Record<string, unknown>, key: string, path: string, errors: SchemaError[]): void {
  if (!(key in obj)) return;
  if (!isPlainObject(obj[key])) {
    errors.push({ path, message: "expected object" });
  }
}

function ensureObject(value: unknown, path: string, errors: SchemaError[]): Record<string, unknown> | null {
  if (!isPlainObject(value)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  return value as Record<string, unknown>;
}

function ensureArray(value: unknown, path: string, errors: SchemaError[]): unknown[] | null {
  if (!Array.isArray(value)) {
    errors.push({ path, message: "expected array" });
    return null;
  }
  return value;
}

function checkRequiredKeys(obj: Record<string, unknown>, keys: string[], path: string, errors: SchemaError[]): void {
  for (const key of keys) {
    if (!(key in obj)) {
      errors.push({ path: `${path}.${key}`, message: "missing required property" });
    }
  }
}

function checkAllowedKeys(obj: Record<string, unknown>, allowed: string[], path: string, errors: SchemaError[]): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      errors.push({ path: `${path}.${key}`, message: "unknown property" });
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: string): boolean {
  const match = datePattern.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= maxDay;
}

function isIsoDateTime(value: string): boolean {
  const match = dateTimePattern.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12) return false;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > maxDay) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;
  const offset = match[8];
  if (offset !== "Z") {
    const offsetMatch = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
    if (!offsetMatch) return false;
    const offsetHours = Number(offsetMatch[2]);
    const offsetMinutes = Number(offsetMatch[3]);
    if (offsetHours < 0 || offsetHours > 23) return false;
    if (offsetMinutes < 0 || offsetMinutes > 59) return false;
  }
  return !Number.isNaN(Date.parse(value));
}

function checkStepIdUniqueness(skill: SkillDoc, errors: CrossCheckError[]): void {
  const procedure = skill.data.procedure as Array<Record<string, unknown>>;
  if (!Array.isArray(procedure)) return;
  const seen = new Map<string, number>();
  procedure.forEach((step, index) => {
    const stepId = step.step_id;
    if (typeof stepId !== "string") return;
    if (seen.has(stepId)) {
      errors.push({
        file: skill.path,
        path: `$.procedure[${index}].step_id`,
        message: `duplicate step_id '${stepId}' also at index ${seen.get(stepId)}`,
      });
      return;
    }
    seen.set(stepId, index);
  });
}

function checkEvalTestsNonEmpty(skill: SkillDoc, errors: CrossCheckError[]): void {
  const evalBlock = skill.data.eval as Record<string, unknown>;
  if (!isPlainObject(evalBlock)) return;
  const tests = evalBlock.tests;
  if (!Array.isArray(tests) || tests.length > 0) return;
  errors.push({ file: skill.path, path: "$.eval.tests", message: "must contain at least one test" });
}

function checkUpdatedAfterCreated(skill: SkillDoc, errors: CrossCheckError[]): void {
  const metadata = skill.data.metadata as Record<string, unknown>;
  if (!isPlainObject(metadata)) return;
  const created = metadata.created;
  const updated = metadata.updated;
  if (typeof created !== "string" || typeof updated !== "string") return;
  if (!isIsoDate(created) || !isIsoDate(updated)) return;
  const createdDate = Date.parse(`${created}T00:00:00Z`);
  const updatedDate = Date.parse(`${updated}T00:00:00Z`);
  if (Number.isNaN(createdDate) || Number.isNaN(updatedDate)) return;
  if (updatedDate < createdDate) {
    errors.push({
      file: skill.path,
      path: "$.metadata.updated",
      message: "must be on or after metadata.created",
    });
  }
}

function checkDependencyRefs(skill: SkillDoc, idMap: Map<string, SkillDoc[]>, errors: CrossCheckError[]): void {
  const deps = skill.data.dependencies as Record<string, unknown>;
  if (!isPlainObject(deps)) return;
  const skills = deps.skills;
  if (!Array.isArray(skills)) return;
  skills.forEach((entry, index) => {
    if (typeof entry !== "string") return;
    const parsed = parseSkillRef(entry);
    if (!parsed) {
      errors.push({
        file: skill.path,
        path: `$.dependencies.skills[${index}]`,
        message: "invalid skill reference (expected id@range)",
      });
      return;
    }
    if (!idMap.has(parsed.id)) {
      errors.push({
        file: skill.path,
        path: `$.dependencies.skills[${index}]`,
        message: `unknown skill id '${parsed.id}'`,
      });
      return;
    }
    if (!isValidRange(parsed.range)) {
      errors.push({
        file: skill.path,
        path: `$.dependencies.skills[${index}]`,
        message: `invalid version range '${parsed.range}'`,
      });
    }
  });
}

function parseSkillRef(value: string): { id: string; range: string } | null {
  const atIndex = value.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === value.length - 1) {
    return null;
  }
  const id = value.slice(0, atIndex);
  const range = value.slice(atIndex + 1);
  if (!idPattern.test(id)) {
    return null;
  }
  return { id, range };
}

function isValidRange(range: string): boolean {
  const trimmed = range.trim();
  if (trimmed.length === 0) return false;
  const comparatorPattern = /^(?:\^|~|>=|<=|>|<|=)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
  return trimmed.split(/\s+/).every((part) => comparatorPattern.test(part));
}

function checkNonEmptyRequiredStrings(skill: SkillDoc, errors: CrossCheckError[]): void {
  const data = skill.data;
  const file = skill.path;

  requireNonEmpty(data.schema_version, file, "$.schema_version", errors);
  requireNonEmpty(data.id, file, "$.id", errors);
  requireNonEmpty(data.name, file, "$.name", errors);
  requireNonEmpty(data.summary, file, "$.summary", errors);
  requireNonEmpty(data.version, file, "$.version", errors);

  const intent = data.intent as Record<string, unknown>;
  requireNonEmpty(intent?.goal, file, "$.intent.goal", errors);
  requireNonEmptyArray(intent?.non_goals, file, "$.intent.non_goals", errors);

  checkInputOutputs(data.inputs as unknown[], "$.inputs", file, errors);
  checkInputOutputs(data.outputs as unknown[], "$.outputs", file, errors);

  const procedure = data.procedure as Array<Record<string, unknown>>;
  if (Array.isArray(procedure)) {
    procedure.forEach((step, index) => {
      requireNonEmpty(step.step_id, file, `$.procedure[${index}].step_id`, errors);
      requireNonEmpty(step.instruction, file, `$.procedure[${index}].instruction`, errors);
      requireNonEmptyArray(step.checks, file, `$.procedure[${index}].checks`, errors, true);
    });
  }

  const constraints = data.constraints as Record<string, unknown>;
  requireNonEmptyArray(constraints?.safety, file, "$.constraints.safety", errors);
  requireNonEmptyArray(constraints?.privacy, file, "$.constraints.privacy", errors);
  requireNonEmptyArray(constraints?.licensing, file, "$.constraints.licensing", errors);

  const dependencies = data.dependencies as Record<string, unknown>;
  requireNonEmptyArray(dependencies?.tools, file, "$.dependencies.tools", errors);
  requireNonEmptyArray(dependencies?.skills, file, "$.dependencies.skills", errors);

  const evalBlock = data.eval as Record<string, unknown>;
  requireNonEmptyArray(evalBlock?.acceptance_criteria, file, "$.eval.acceptance_criteria", errors);
  const tests = evalBlock?.tests as Array<Record<string, unknown>>;
  if (Array.isArray(tests)) {
    tests.forEach((test, index) => {
      requireNonEmpty(test.name, file, `$.eval.tests[${index}].name`, errors);
      if (test.notes !== undefined) {
        requireNonEmpty(test.notes, file, `$.eval.tests[${index}].notes`, errors);
      }
    });
  }

  const metadata = data.metadata as Record<string, unknown>;
  requireNonEmptyArray(metadata?.tags, file, "$.metadata.tags", errors);
  requireNonEmptyArray(metadata?.authors, file, "$.metadata.authors", errors);
  requireNonEmpty(metadata?.created, file, "$.metadata.created", errors);
  requireNonEmpty(metadata?.updated, file, "$.metadata.updated", errors);

  if (data.failure_modes !== undefined) {
    requireNonEmptyArray(data.failure_modes, file, "$.failure_modes", errors);
  }

  const provenance = data.provenance as Record<string, unknown>;
  if (isPlainObject(provenance)) {
    if (provenance.source_type !== undefined) {
      requireNonEmpty(provenance.source_type, file, "$.provenance.source_type", errors);
    }
    if (provenance.source_ref !== undefined) {
      requireNonEmpty(provenance.source_ref, file, "$.provenance.source_ref", errors);
    }
    if (provenance.compiled_by !== undefined) {
      requireNonEmpty(provenance.compiled_by, file, "$.provenance.compiled_by", errors);
    }
    if (provenance.compiled_at !== undefined) {
      requireNonEmpty(provenance.compiled_at, file, "$.provenance.compiled_at", errors);
    }
    if (Array.isArray(provenance.field_evidence)) {
      provenance.field_evidence.forEach((entry, index) => {
        const evidence = entry as Record<string, unknown>;
        requireNonEmpty(evidence?.json_path, file, `$.provenance.field_evidence[${index}].json_path`, errors);
        requireNonEmpty(evidence?.quote, file, `$.provenance.field_evidence[${index}].quote`, errors);
      });
    }
  }
}

function checkInputOutputs(entries: unknown[], path: string, file: string, errors: CrossCheckError[]): void {
  if (!Array.isArray(entries)) return;
  entries.forEach((entry, index) => {
    const item = entry as Record<string, unknown>;
    requireNonEmpty(item?.name, file, `${path}[${index}].name`, errors);
    requireNonEmpty(item?.type, file, `${path}[${index}].type`, errors);
    requireNonEmpty(item?.description, file, `${path}[${index}].description`, errors);
    if (Array.isArray(item?.examples)) {
      item.examples.forEach((example: unknown, exampleIndex: number) => {
        requireNonEmpty(example, file, `${path}[${index}].examples[${exampleIndex}]`, errors);
      });
    }
  });
}

function requireNonEmpty(value: unknown, file: string, path: string, errors: CrossCheckError[]): void {
  if (typeof value !== "string") return;
  if (value.trim().length === 0) {
    errors.push({ file, path, message: "must be a non-empty string" });
  }
}

function requireNonEmptyArray(value: unknown, file: string, path: string, errors: CrossCheckError[], optional = false): void {
  if (value === undefined || value === null) {
    if (!optional) {
      errors.push({ file, path, message: "missing required array" });
    }
    return;
  }
  if (!Array.isArray(value)) return;
  value.forEach((entry, index) => {
    requireNonEmpty(entry, file, `${path}[${index}]`, errors);
  });
}
