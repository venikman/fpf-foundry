#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

type RunResult = {
  ok: boolean;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  root: string;
};

type Settings = {
  runs: number;
  minSuccessRate: number;
  maxMedianMs: number;
  fixedNow: string;
  json: boolean;
};

type FailureReport = {
  run: number;
  exitCode: number | null;
  durationMs: number;
  root: string;
  stderr: string;
};

type BudgetReport = {
  ok: boolean;
  command: "first-run-budget";
  runs: number;
  successes: number;
  successRate: number;
  medianMs: number | null;
  thresholds: {
    minSuccessRate: number;
    maxMedianMs: number;
  };
  failures: FailureReport[];
  reasons?: string[];
};

class HelpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HelpError";
  }
}

const argv = process.argv.slice(2);
const jsonRequested = argv.includes("--json");

try {
  const settings = parseArgs(argv);
  const report = runBudget(settings);

  if (settings.json) {
    console.log(JSON.stringify(report));
  } else {
    writeConsoleReport(report);
  }

  if (!report.ok) {
    process.exit(1);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const isHelp = error instanceof HelpError;
  if (jsonRequested) {
    const payload = isHelp ? { ok: true, command: "first-run-budget", usage: message } : { ok: false, command: "first-run-budget", error: { message } };
    console.log(JSON.stringify(payload));
  } else if (isHelp) {
    console.log(message);
  } else {
    console.error(message);
  }
  process.exit(isHelp ? 0 : 1);
}

function runBudget(settings: Settings): BudgetReport {
  const results: RunResult[] = [];
  const decoder = new TextDecoder();
  const fpfBin = path.join("packages", "fpf", "bin", "fpf");

  for (let i = 0; i < settings.runs; i += 1) {
    const sandbox = mkdtempSync(path.join(os.tmpdir(), "fpf-first-run-"));
    const root = path.join(sandbox, "workspace");
    const start = Date.now();
    const proc = spawnSync("bun", [fpfBin, "quickstart", "--root", root, "--json"], {
      env: { ...process.env, FPF_FIXED_NOW: settings.fixedNow },
      stdout: "pipe",
      stderr: "pipe",
    });
    const durationMs = Date.now() - start;

    const stdout = proc.stdout ? decoder.decode(proc.stdout) : "";
    const stderr = proc.stderr ? decoder.decode(proc.stderr) : "";
    const ok = proc.status === 0;

    results.push({
      ok,
      exitCode: proc.status,
      durationMs,
      stdout,
      stderr,
      root,
    });

    rmSync(sandbox, { recursive: true, force: true });
  }

  const successes = results.filter((result) => result.ok);
  const successRate = successes.length / settings.runs;
  const durations = successes.map((result) => result.durationMs).sort((a, b) => a - b);
  const medianMs = durations.length === 0 ? null : durations[Math.floor(durations.length / 2)];
  const failures = results
    .map<FailureReport | null>((result, index) => {
      if (result.ok) return null;
      return {
        run: index + 1,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        root: result.root,
        stderr: result.stderr.trim() || "(no stderr)",
      };
    })
    .filter((failure): failure is FailureReport => failure !== null);

  const overBudget = medianMs !== null && medianMs > settings.maxMedianMs;
  const underSuccessRate = successRate < settings.minSuccessRate;
  const reasons: string[] = [];

  if (underSuccessRate) {
    reasons.push(`success rate ${successRate.toFixed(2)} < ${settings.minSuccessRate.toFixed(2)}`);
  }
  if (overBudget) {
    reasons.push(`median ${medianMs} ms > ${settings.maxMedianMs} ms`);
  }

  return {
    ok: !underSuccessRate && !overBudget,
    command: "first-run-budget",
    runs: settings.runs,
    successes: successes.length,
    successRate,
    medianMs,
    thresholds: { minSuccessRate: settings.minSuccessRate, maxMedianMs: settings.maxMedianMs },
    failures,
    ...(reasons.length > 0 ? { reasons } : {}),
  };
}

function writeConsoleReport(report: BudgetReport): void {
  console.log(`Quickstart first-run: ${report.successes}/${report.runs} (${(report.successRate * 100).toFixed(1)}%)`);
  if (report.medianMs !== null) {
    console.log(`Median time-to-first-artifact: ${report.medianMs} ms`);
  }

  if (report.failures.length > 0) {
    console.log("Failures:");
    for (const failure of report.failures) {
      console.log(`- run ${failure.run}: exit=${failure.exitCode ?? "null"}, durationMs=${failure.durationMs}, root=${failure.root}, stderr=${failure.stderr}`);
    }
  }

  if (!report.ok && report.reasons && report.reasons.length > 0) {
    console.error(`First-run budget failed: ${report.reasons.join("; ")}`);
  }
}

function parseArgs(argv: string[]): Settings {
  let runs = 10;
  let minSuccessRate = 0.9;
  let maxMedianMs = 300000;
  let json = false;
  const fixedNow = (process.env.FPF_FIXED_NOW ?? "2026-01-01T00:00:00.000Z").trim();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--runs") {
      runs = parseNumberArg(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--min-success-rate") {
      minSuccessRate = parseFloatArg(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--max-median-ms") {
      maxMedianMs = parseNumberArg(argv, i, arg);
      i += 1;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      throw new HelpError(
        [
          "Usage: bun develop/scripts/first_run_budget.ts [options]",
          "",
          "Options:",
          "  --runs <n>              Number of fresh runs (default: 10)",
          "  --min-success-rate <p>  Required success rate (default: 0.9)",
          "  --max-median-ms <ms>    Median time budget in ms (default: 300000)",
          "  --json                  Emit JSON only",
        ].join("\n"),
      );
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }

  if (runs < 1) {
    throw new Error(`Invalid --runs '${runs}'. Expected >= 1.`);
  }
  if (minSuccessRate <= 0 || minSuccessRate > 1) {
    throw new Error(`Invalid --min-success-rate '${minSuccessRate}'. Expected (0, 1].`);
  }
  if (maxMedianMs < 1) {
    throw new Error(`Invalid --max-median-ms '${maxMedianMs}'. Expected >= 1.`);
  }

  return { runs, minSuccessRate, maxMedianMs, fixedNow, json };
}

function parseNumberArg(argv: string[], index: number, name: string): number {
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${name}.`);
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid value for ${name}: '${value}'.`);
  }
  return parsed;
}

function parseFloatArg(argv: string[], index: number, name: string): number {
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${name}.`);
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid value for ${name}: '${value}'.`);
  }
  return parsed;
}
