export function writeJsonLine(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

export function writeLines(stream: NodeJS.WritableStream, lines: string[]): void {
  if (lines.length === 0) {
    return;
  }
  stream.write(`${lines.join("\n")}\n`);
}

