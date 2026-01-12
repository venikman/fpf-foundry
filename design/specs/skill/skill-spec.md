# SkillSpec v0.1.0

## Purpose
SkillSpec is the canonical, versioned format for describing an executable skill. It is human-authored in YAML and machine-validated as JSON. The schema is strict, deterministic, and designed for both LLM generation and human refinement without structural drift.

## Authoring and canonicalization (normative)
- Author in YAML (YAML 1.2 subset defined below).
- Parse YAML to JSON.
- Canonical form for hashing/signing is JSON with lexicographically sorted object keys, 2-space indentation, LF newlines, and a trailing newline.

## YAML subset (normative)
- No anchors, aliases, merge keys, or custom tags.
- No inline collections (`{}` or `[]`) except for empty `{}` and `[]`.
- Indentation uses spaces only (tabs are invalid).
- Quote strings that contain `:` or `#`, or leading/trailing whitespace.
- Multi-line strings must use block scalars (`|` or `>`).

## Unknown policy (normative)
If a required field cannot be derived, use the explicit placeholder value `"UNKNOWN"` and record missing facts in `failure_modes` or `provenance.field_evidence` with a `quote` of `"UNKNOWN"`. Do not invent facts.

## Field contract (v0.1.0)

### Top-level required fields
- `schema_version` (string, exact `"0.1.0"`)
- `id` (string, kebab-case or slash-separated segments, globally unique in repo)
- `name` (string, human title)
- `summary` (string, 1-3 sentences)
- `intent` (object)
- `inputs` (array)
- `outputs` (array)
- `procedure` (array of steps, ordered)
- `constraints` (object)
- `dependencies` (object)
- `eval` (object)
- `version` (string, semver)
- `metadata` (object)

### intent (required)
- `goal` (string)
- `non_goals` (array of strings, can be empty)

### inputs (required)
Array of input objects:
- `name` (string)
- `type` (string)
- `description` (string)
- `required` (bool)
- `examples` (array of strings, optional)

### outputs (required)
Array of output objects:
- `name` (string)
- `type` (string)
- `description` (string)
- `examples` (array of strings, optional)

### procedure (required)
Array of ordered steps:
- `step_id` (string)
- `instruction` (string, imperative)
- `checks` (array of strings, optional)

### constraints (required)
- `safety` (array of strings)
- `privacy` (array of strings)
- `licensing` (array of strings)

### dependencies (required)
- `tools` (array of strings, can be empty)
- `skills` (array of `skill_id@version_range`, can be empty)

Version range syntax (validator-supported): `^1.2.3`, `~1.2.3`, `>=1.2.3`, `<=1.2.3`, `>1.2.3`, `<1.2.3`, `=1.2.3`, or two comparators separated by a space (e.g., `>=1.2.3 <2.0.0`).

### eval (required)
- `acceptance_criteria` (array of strings)
- `tests` (array of objects)

Each test object:
- `name` (string)
- `input_fixture` (object)
- `expected` (object)
- `notes` (string, optional)

### metadata (required)
- `tags` (array of strings)
- `authors` (array of strings)
- `created` (string, ISO-8601 date)
- `updated` (string, ISO-8601 date)

### Optional but recommended
- `failure_modes` (array of strings)
- `quality` (object: `precision_priority`, `latency_priority`, `cost_priority` each 0-1 float)
- `provenance` (object for traceability)

`provenance` fields:
- `source_type` (`article` | `doc` | `chat` | `other`)
- `source_ref` (string)
- `compiled_by` (string, model/tool id)
- `compiled_at` (ISO-8601 datetime)
- `field_evidence` (array of `{json_path, quote}`)

## Hard rules (normative)
- Procedure steps must be actionable and checkable; no "do the thing" steps.
- `eval.tests[*].expected` must be concrete enough to compare (even if approximate).
- `dependencies.skills` must reference existing ids and valid version ranges (validator cross-check).

## Validator cross-checks (normative)
- `id` is unique across the repo.
- `procedure.step_id` values are unique within a skill.
- Required text fields are non-empty strings (after trim).
- `metadata.updated` is on or after `metadata.created`.
- `eval.tests` is non-empty.
- `dependencies.skills` references resolve to known ids and valid version ranges.

## Canonicalization algorithm (normative)
1. Parse YAML to JSON using the YAML subset.
2. Recursively sort all object keys lexicographically.
3. Serialize with 2-space indentation and LF newlines.
4. Append a trailing newline.

## Minimal example (valid)
```yaml
schema_version: "0.1.0"
id: hello-skill
name: Hello Skill
summary: "Returns a friendly greeting."
intent:
  goal: "Generate a greeting message."
  non_goals: []
inputs:
  - name: recipient
    type: string
    description: "Name of the person to greet."
    required: true
outputs:
  - name: greeting
    type: string
    description: "Greeting message."
procedure:
  - step_id: step-greet
    instruction: "Create a greeting using the recipient name."
constraints:
  safety: []
  privacy: []
  licensing: []
dependencies:
  tools: []
  skills: []
eval:
  acceptance_criteria:
    - "Includes the recipient name."
  tests:
    - name: basic
      input_fixture:
        recipient: "Ada"
      expected:
        greeting: "Hello, Ada."
version: "0.1.0"
metadata:
  tags:
    - example
  authors:
    - "FPF Foundry"
  created: "2026-01-01"
  updated: "2026-01-01"
```
