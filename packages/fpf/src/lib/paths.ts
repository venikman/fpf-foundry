import { relative, sep } from "path";

export function toPosixPath(value: string): string {
  return value.split(sep).join("/");
}

export function toRootRelativePosixPath(absPath: string, rootDir: string): string {
  const rel = relative(rootDir, absPath);
  if (!rel || rel === "." || rel.startsWith(`..${sep}`) || rel === "..") {
    return toPosixPath(absPath);
  }
  return toPosixPath(rel);
}

