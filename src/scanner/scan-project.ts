import path from "node:path";
import { readFileSync } from "node:fs";
import { loadConfig } from "../config/load-config";
import { discoverProjectFiles } from "./file-discovery";
import { isClientComponentSource, isServerOnlyModule } from "./client-boundary";
import { buildImportGraph } from "./import-graph";
import { detectEnvIssues, BASE_SERVER_ENV_NAMES } from "./env-detector";
import { summarizeIssues } from "./severity";
import type { Issue, PresetDefinition, ScanProjectOptions, ScanReport, Severity } from "./types";

import { supabasePreset } from "../presets/supabase";
import { stripePreset } from "../presets/stripe";
import { prismaPreset } from "../presets/prisma";
import { openaiPreset } from "../presets/openai";
import { authPreset } from "../presets/auth";

const PRESET_REGISTRY: Record<string, PresetDefinition> = {
  supabase: supabasePreset,
  stripe: stripePreset,
  prisma: prismaPreset,
  openai: openaiPreset,
  auth: authPreset
};

function toPosixRelative(root: string, absolutePath: string): string {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function normalizePresetNames(names: string[]): string[] {
  return Array.from(
    new Set(
      names
        .flatMap((name) => name.split(","))
        .map((name) => name.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function normalizeSeverityList(values: Severity[] | undefined): Severity[] {
  return Array.from(new Set(values ?? []));
}

function getPresetDefinitions(names: string[]): PresetDefinition[] {
  return names
    .map((name) => PRESET_REGISTRY[name])
    .filter((preset): preset is PresetDefinition => Boolean(preset));
}

function formatChain(chain: string[]): string {
  return chain.join(" -> ");
}

export async function scanProject(options: ScanProjectOptions = {}): Promise<ScanReport> {
  const root = path.resolve(options.root ?? process.cwd());
  const config = await loadConfig({
    root,
    configPath: options.configPath,
    presets: normalizePresetNames(options.presets ?? []),
    failOn: normalizeSeverityList(options.failOn)
  });
  const presetDefinitions = getPresetDefinitions(config.presets);

  const files = await discoverProjectFiles(root, config.include, config.exclude);
  const graph = buildImportGraph(files, root);
  const contentCache = new Map<string, string>();
  const issues: Issue[] = [];
  const issueIds = new Set<string>();
  const clientRoots = files.filter((file) => {
    const source = readFileSync(file, "utf8");
    contentCache.set(file, source);
    return isClientComponentSource(source);
  });

  for (const rootFile of clientRoots) {
    const rootRelative = toPosixRelative(root, rootFile);
    const stack: Array<{ file: string; chain: string[]; entryLine: number }> = [
      {
        file: rootFile,
        chain: [rootRelative],
        entryLine: 1
      }
    ];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || visited.has(current.file)) {
        continue;
      }

      visited.add(current.file);

      const currentSource = contentCache.get(current.file) ?? readFileSync(current.file, "utf8");
      contentCache.set(current.file, currentSource);
      const currentRelative = toPosixRelative(root, current.file);
      const edges = graph.get(current.file) ?? [];

      for (const envIssue of detectEnvIssues({
        file: currentRelative,
        source: currentSource,
        serverEnvNames: BASE_SERVER_ENV_NAMES,
        secretPatterns: config.secretPatterns,
        allowedPublicEnv: config.allowedPublicEnv,
        presets: presetDefinitions
      })) {
        if (!issueIds.has(envIssue.id)) {
          issueIds.add(envIssue.id);
          issues.push(envIssue);
        }
      }

      if (isServerOnlyModule(currentRelative, currentSource, config.serverOnlyPaths)) {
        continue;
      }

      for (const edge of edges) {
        const targetSource = contentCache.get(edge.target) ?? readFileSync(edge.target, "utf8");
        contentCache.set(edge.target, targetSource);
        const targetRelative = toPosixRelative(root, edge.target);
        const chain = [...current.chain, targetRelative];

        if (isServerOnlyModule(targetRelative, targetSource, config.serverOnlyPaths)) {
          const issueId = `reachability:${rootRelative}:${targetRelative}`;
          if (!issueIds.has(issueId)) {
            issueIds.add(issueId);
            issues.push({
              id: issueId,
              severity: "HIGH",
              title: "Client component reaches server-only module",
              message: `Reachability path: ${formatChain(chain)}`,
              file: rootRelative,
              line: current.entryLine,
              variableName: targetRelative,
              suggestion: "Move server-only code behind a server action, route handler, or server component boundary."
            });
          }
          continue;
        }

        if (!visited.has(edge.target)) {
          stack.push({
            file: edge.target,
            chain,
            entryLine: current.entryLine === 1 ? edge.line : current.entryLine
          });
        }
      }
    }
  }

  issues.sort((left, right) => {
    const severityOrder = ["HIGH", "MEDIUM", "LOW", "INFO"] as const;
    const leftIndex = severityOrder.indexOf(left.severity);
    const rightIndex = severityOrder.indexOf(right.severity);
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    if (left.file !== right.file) {
      return left.file.localeCompare(right.file);
    }

    return left.line - right.line;
  });

  return {
    root,
    filesScanned: files.length,
    presetsUsed: presetDefinitions.map((preset) => preset.name),
    failOn: config.failOn,
    issues,
    summary: summarizeIssues(issues)
  };
}
