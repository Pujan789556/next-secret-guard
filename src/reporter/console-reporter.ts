import pc from "picocolors";
import type { Issue, ScanReport } from "../scanner/types";

const SEVERITY_STYLES: Record<Issue["severity"], (value: string) => string> = {
  HIGH: pc.red,
  MEDIUM: pc.yellow,
  LOW: pc.cyan,
  INFO: pc.blue
};

function formatIssue(issue: Issue): string {
  const severity = SEVERITY_STYLES[issue.severity](issue.severity);
  const location = pc.dim(`${issue.file}:${issue.line}`);

  return [
    `  ${severity} ${location}`,
    `    ${pc.bold(issue.title)}`,
    `    ${issue.message}`,
    `    Suggestion: ${issue.suggestion}`,
    `    Variable: ${issue.variableName}`
  ].join("\n");
}

export function renderConsoleReport(report: ScanReport): string {
  const lines: string[] = [];
  lines.push(pc.bold("next-secret-guard scan"));
  lines.push(`Root: ${pc.dim(report.root)}`);
  lines.push(`Files scanned: ${report.filesScanned}`);
  lines.push(`Fail on: ${report.failOn.length > 0 ? report.failOn.join(", ") : "none"}`);
  lines.push(`Issues found: ${report.summary.total}`);
  lines.push("");

  if (report.issues.length === 0) {
    lines.push(pc.green("No issues found."));
  } else {
    for (const severity of ["HIGH", "MEDIUM", "LOW", "INFO"] as const) {
      const grouped = report.issues.filter((issue) => issue.severity === severity);
      if (grouped.length === 0) {
        continue;
      }

      lines.push(`${SEVERITY_STYLES[severity](severity)} (${grouped.length})`);
      for (const issue of grouped) {
        lines.push(formatIssue(issue));
      }
      lines.push("");
    }
  }

  lines.push(
    pc.bold("Summary:"),
    `  ${pc.red(`${report.summary.high} high`)}, ${pc.yellow(`${report.summary.medium} medium`)}, ${pc.cyan(`${report.summary.low} low`)}, ${pc.blue(`${report.summary.info} info`)}`,
    `  Exit code: ${report.failOn.length > 0 ? "1 when an issue matches failOn, otherwise 0" : "0"}`
  );

  return lines.join("\n");
}
