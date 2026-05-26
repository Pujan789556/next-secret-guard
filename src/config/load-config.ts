import "tsx/esm";

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_ALLOWED_PUBLIC_ENV, DEFAULT_CONFIG, DEFAULT_FAIL_ON, DEFAULT_SECRET_PATTERNS, DEFAULT_SERVER_ONLY_PATHS } from "./default-config";
import type { ConfigFileInput, LoadConfigOptions, ScannerConfig, Severity } from "../scanner/types";

const CONFIG_FILENAMES = [
  "next-secret-guard.config.ts",
  "next-secret-guard.config.mjs",
  "next-secret-guard.config.js",
  ".next-secret-guard.json"
];

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function dedupeSeverities(values: Severity[]): Severity[] {
  return Array.from(new Set(values));
}

function mergeStringArrays(defaultValues: string[], userValues?: string[]): string[] {
  return dedupe([...(defaultValues ?? []), ...(userValues ?? [])]);
}

function mergeFailOn(defaultValues: Severity[], userValues?: Severity[]): Severity[] {
  return dedupeSeverities(userValues !== undefined ? userValues : defaultValues);
}

function normalizeConfigShape(input: Partial<ConfigFileInput> | undefined): ConfigFileInput {
  if (!input) {
    return {};
  }

  return {
    include: input.include,
    exclude: input.exclude,
    secretPatterns: input.secretPatterns,
    allowedPublicEnv: input.allowedPublicEnv,
    serverOnlyPaths: input.serverOnlyPaths,
    failOn: input.failOn,
    presets: input.presets,
    framework: input.framework
  };
}

function resolveConfigPath(root: string, configPath?: string): string | undefined {
  if (configPath) {
    const resolved = path.isAbsolute(configPath) ? configPath : path.resolve(root, configPath);
    try {
      return statSync(resolved).isFile() ? resolved : undefined;
    } catch {
      return undefined;
    }
  }

  for (const fileName of CONFIG_FILENAMES) {
    const candidate = path.resolve(root, fileName);
    if (existsSync(candidate)) {
      try {
        if (statSync(candidate).isFile()) {
          return candidate;
        }
      } catch {
        // Ignore unreadable candidates and keep scanning for a usable config file.
      }
    }
  }

  return undefined;
}

async function loadConfigFile(configPath: string): Promise<Partial<ConfigFileInput>> {
  const extension = path.extname(configPath).toLowerCase();

  if (extension === ".json") {
    return JSON.parse(readFileSync(configPath, "utf8")) as Partial<ConfigFileInput>;
  }

  const module = await import(pathToFileURL(configPath).href);
  return normalizeConfigShape(module.default ?? module);
}

export async function loadConfig(options: LoadConfigOptions): Promise<ScannerConfig> {
  const resolvedPath = resolveConfigPath(options.root, options.configPath);
  const fileConfig = resolvedPath ? await loadConfigFile(resolvedPath) : {};
  const failOn = options.failOn !== undefined ? options.failOn : fileConfig.failOn;

  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    include: mergeStringArrays(DEFAULT_CONFIG.include, fileConfig.include),
    exclude: mergeStringArrays(DEFAULT_CONFIG.exclude, fileConfig.exclude),
    secretPatterns: mergeStringArrays(DEFAULT_SECRET_PATTERNS, fileConfig.secretPatterns),
    allowedPublicEnv: mergeStringArrays(DEFAULT_ALLOWED_PUBLIC_ENV, fileConfig.allowedPublicEnv),
    serverOnlyPaths: mergeStringArrays(DEFAULT_SERVER_ONLY_PATHS, fileConfig.serverOnlyPaths),
    failOn: mergeFailOn(DEFAULT_FAIL_ON, failOn),
    presets: dedupe([...(DEFAULT_CONFIG.presets ?? []), ...(fileConfig.presets ?? []), ...(options.presets ?? [])]),
    framework: fileConfig.framework ?? DEFAULT_CONFIG.framework
  };
}
