export function parseSemicolonList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function resolveNow(): Date {
  const fixedNow = process.env.FPF_FIXED_NOW?.trim();
  if (fixedNow && fixedNow.length > 0) {
    const parsed = new Date(fixedNow);
    if (Number.isNaN(parsed.getTime())) {
      console.error(`Invalid FPF_FIXED_NOW '${fixedNow}'. Expected an ISO-8601 date-time.`);
      process.exit(1);
    }
    return parsed;
  }

  return new Date();
}

export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
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

