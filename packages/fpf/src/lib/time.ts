import { CliError } from "./errors.ts";

export function resolveNow(): Date {
  const fixedNow = process.env.FPF_FIXED_NOW?.trim();
  if (fixedNow && fixedNow.length > 0) {
    return parseIsoTimestampOrThrow(fixedNow, "FPF_FIXED_NOW");
  }

  return new Date();
}

export function parseIsoTimestampOrThrow(value: string, source: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new CliError("INVALID_TIMESTAMP", `Invalid ${source} '${value}'. Expected an ISO-8601 date-time.`, 1);
  }
  return parsed;
}

