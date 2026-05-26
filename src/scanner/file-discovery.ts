import fg from "fast-glob";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { DEFAULT_CONFIG } from "../config/default-config";

const ROOT_ENV_FILENAMES = [
  ".env",
  ".env.example",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test"
];

function toGlobPath(segment: string): string {
  return segment.split(path.sep).join(path.posix.sep);
}

function hasGlobCharacters(value: string): boolean {
  return /[*?[\]{}()!+@]/.test(value);
}

function normalizeIncludePattern(pattern: string): string {
  const normalized = toGlobPath(pattern);
  if (hasGlobCharacters(normalized)) {
    return normalized;
  }

  return path.posix.join(normalized, "**/*.{ts,tsx,js,jsx,mts,mjs,cjs}");
}

export async function discoverProjectFiles(
  root: string,
  include: string[] = DEFAULT_CONFIG.include,
  exclude: string[] = DEFAULT_CONFIG.exclude
): Promise<string[]> {
  const patterns = include.map((pattern) => normalizeIncludePattern(pattern));

  return fg(patterns, {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    unique: true,
    dot: false,
    ignore: exclude
  });
}

export async function discoverRootEnvFiles(root: string): Promise<string[]> {
  return ROOT_ENV_FILENAMES.map((fileName) => path.resolve(root, fileName)).filter((candidate) => {
    if (!existsSync(candidate)) {
      return false;
    }

    try {
      return statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
}
