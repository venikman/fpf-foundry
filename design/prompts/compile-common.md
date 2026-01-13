# Compile Prompt Common Rules (SkillSpec v0.1.0)

## Compile interface
Inputs:
- TARGET_SCHEMA (SkillSpec schema or field list)
- SOURCE_TEXT (raw input)
- CONTEXT (optional repo conventions and constraints)
- MODE (strict | trace | fast)

Outputs:
- skill.json (SkillSpec JSON that validates against TARGET_SCHEMA)
- compile-report.json (strict/trace only)

## Output format
- Strict/trace: output exactly two fenced blocks in this order:
  1) ```json``` skill.json
  2) ```json``` compile-report.json
- Fast: output only the ```json``` block.
- No prose outside fenced blocks.

## Core rules (apply to all modes)
- Follow TARGET_SCHEMA exactly; do not emit extra keys outside the schema.
- Do not invent facts. If SOURCE_TEXT does not state something, mark it UNKNOWN/empty per the unknown policy.
- Use short, imperative procedure steps.
- Provide at least 3 acceptance_criteria and at least 2 tests unless impossible; if impossible, explain why in compile-report.json.

## Formatting rules
- Use ASCII characters only (no smart quotes or non-ASCII hyphens).
- Use lowercase kebab-case step_id values in the format `step-<verb>`; keep verbs short and consistent.
- End each acceptance_criteria and non_goals entry with a period.
- When SOURCE_TEXT provides exact wording for descriptions, constraints, or criteria, copy verbatim and preserve casing/punctuation.

## Unknown policy
- Required string missing: use "UNKNOWN" and list its json_path in compile-report.missing_required.
- Required array/object missing: use empty array/object and list its json_path in compile-report.missing_required.
- Optional field missing: omit it or use empty array/object; do not list it in missing_required.
- Never add domain facts not present in SOURCE_TEXT.

## Self-validation checklist (do silently before output)
- All required fields present.
- No extra fields.
- Dates are ISO-8601 (YYYY-MM-DD).
- Semver matches x.y.z (optionally with pre-release/build).
- eval.tests contain concrete expected outputs.
- If a check fails, fix it without adding new facts; if impossible, report in compile-report.json.
