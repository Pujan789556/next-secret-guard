#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { scanProject } from "./scanner/scan-project";
import { renderConsoleReport } from "./reporter/console-reporter";
import { shouldFailOnSeverities, type Severity } from "./scanner/severity";

function normalizePresetInput(values: string[] | string | undefined): string[] {
  if (!values) {
    return [];
  }

  const rawValues = Array.isArray(values) ? values : [values];
  return Array.from(
    new Set(
      rawValues
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function normalizeSeverityInput(values: string[] | string | undefined): Severity[] {
  if (!values) {
    return [];
  }

  const valid: Severity[] = [];
  const seen = new Set<Severity>();
  const rawValues = Array.isArray(values) ? values : [values];

  for (const value of rawValues.flatMap((entry) => entry.split(","))) {
    const normalized = value.trim().toUpperCase();
    if (normalized === "HIGH" || normalized === "MEDIUM" || normalized === "LOW" || normalized === "INFO") {
      if (!seen.has(normalized)) {
        seen.add(normalized);
        valid.push(normalized);
      }
    }
  }

  return valid;
}

function normalizeArgv(argv: string[]): string[] {
  const args = [...argv];
  const command = args[2];
  if (!command || command.startsWith("-")) {
    return [...args.slice(0, 2), "scan", ...args.slice(2)];
  }

  return args;
}

export async function main(argv = process.argv): Promise<void> {
  const program = new Command();
  program.name("next-secret-guard").description("Scan a Next.js project for accidental secret exposure.");

  program
    .command("scan")
    .description("Scan the current project for secret exposure risks")
    .option("--root <path>", "project root to scan", process.cwd())
    .option("--ci", "exit with code 1 when issues match the configured failOn thresholds", false)
    .option("--json", "print a JSON report", false)
    .option("--format <format>", "output format", "text")
    .option("--fail-on <severity>", "override severity thresholds used by --ci", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("--preset <name>", "enable a preset; can be repeated or comma-separated", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("--config <path>", "path to a configuration file")
    .action(async (options) => {
      const presets = normalizePresetInput(options.preset);
      const failOn = normalizeSeverityInput(options.failOn);
      const report = await scanProject({
        root: path.resolve(options.root),
        configPath: options.config,
        presets,
        failOn: failOn.length > 0 ? failOn : undefined
      });

      const format = options.json ? "json" : options.format;
      if (format === "json") {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        process.stdout.write(`${renderConsoleReport(report)}\n`);
      }

      const thresholds = failOn.length > 0 ? failOn : report.failOn;
      if (options.ci && shouldFailOnSeverities(report.issues, thresholds)) {
        process.exitCode = 1;
      }
    });

  await program.parseAsync(normalizeArgv(argv));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${pc.red("next-secret-guard failed")}\n${message}\n`);
    process.exitCode = 1;
  });
}
