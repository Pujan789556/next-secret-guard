import fg from "fast-glob";
import path from "node:path";
import { DEFAULT_CONFIG } from "../config/default-config";

function toGlobPath(segment: string): string {
  return segment.split(path.sep).join(path.posix.sep);
}

export async function discoverProjectFiles(
  root: string,
  include: string[] = DEFAULT_CONFIG.include,
  exclude: string[] = DEFAULT_CONFIG.exclude
): Promise<string[]> {
  const patterns = include.map((dir) => toGlobPath(path.posix.join(dir, "**/*.{ts,tsx,js,jsx,mts,mjs,cjs}")));

  return fg(patterns, {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    unique: true,
    dot: false,
    ignore: exclude
  });
}
