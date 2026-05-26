#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { scanProject } from "./scanner/scan-project";
import { renderConsoleReport } from "./reporter/console-reporter";
import { parseSeverity, shouldFailOnSeverity } from "./scanner/severity";

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
    .option("--ci", "exit with code 1 when HIGH or MEDIUM issues are found", false)
    .option("--json", "print a JSON report", false)
    .option("--format <format>", "output format", "text")
    .option("--fail-on <severity>", "exit with code 1 when issues at or above the given severity are found")
    .option("--preset <name>", "enable a preset; can be repeated or comma-separated", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("--config <path>", "path to a configuration file")
    .action(async (options) => {
      const presets = normalizePresetInput(options.preset);
      const report = await scanProject({
        root: path.resolve(options.root),
        configPath: options.config,
        presets
      });

      const format = options.json ? "json" : options.format;
      if (format === "json") {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        process.stdout.write(`${renderConsoleReport(report)}\n`);
      }

      const threshold = options.ci ? "MEDIUM" : options.failOn ? parseSeverity(options.failOn) : undefined;
      if (threshold && shouldFailOnSeverity(report.issues, threshold)) {
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
