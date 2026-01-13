import { execFileSync } from "child_process";

export const gitMaxBufferBytes = 64 * 1024 * 1024;

export function listTrackedFiles(): string[] {
  return gitZ("ls-files");
}

export function listStagedFiles(): string[] {
  return gitZ("diff", "--cached", "--name-only", "--diff-filter=ACMR");
}

function gitZ(...gitArgs: string[]): string[] {
  const buffer = execFileSync("git", [...gitArgs, "-z"], { encoding: null, maxBuffer: gitMaxBufferBytes });
  return buffer
    .toString("utf8")
    .split("\0")
    .filter((entry) => entry.length > 0);
}
