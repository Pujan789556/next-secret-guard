import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_CONFIG } from "./default-config";
import type { ConfigFileInput, LoadConfigOptions, ScannerConfig } from "../scanner/types";

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function mergeChecks(input: ConfigFileInput["checks"]): ScannerConfig["checks"] {
  return {
    ...DEFAULT_CONFIG.checks,
    ...input
  };
}

function resolveConfigPath(root: string, configPath?: string): string | undefined {
  if (configPath) {
    return path.isAbsolute(configPath) ? configPath : path.resolve(root, configPath);
  }

  const defaultPath = path.resolve(root, ".next-secret-guard.json");
  return existsSync(defaultPath) ? defaultPath : undefined;
}

export function loadConfig(options: LoadConfigOptions): ScannerConfig {
  const configPath = resolveConfigPath(options.root, options.configPath);
  const fileConfig: ConfigFileInput = configPath ? JSON.parse(readFileSync(configPath, "utf8")) : {};
  const presetNames = dedupe([...(DEFAULT_CONFIG.presets ?? []), ...(fileConfig.presets ?? []), ...(options.presets ?? [])]);

  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    include: dedupe([...(DEFAULT_CONFIG.include ?? []), ...(fileConfig.include ?? [])]),
    exclude: dedupe([...(DEFAULT_CONFIG.exclude ?? []), ...(fileConfig.exclude ?? [])]),
    presets: presetNames,
    checks: mergeChecks(fileConfig.checks)
  };
}
