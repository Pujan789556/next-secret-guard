import pc from "picocolors";
import type { Issue, ScanReport, Severity } from "../scanner/types";

const SEVERITY_STYLES: Record<Severity, (value: string) => string> = {
  HIGH: pc.red,
  MEDIUM: pc.yellow,
  LOW: pc.cyan,
  INFO: pc.blue
};

function padRight(value: string, width: number): string {
  const padding = Math.max(0, width - value.length);
  return `${value}${" ".repeat(padding)}`;
}

function visibleLength(value: string): number {
  return value.length;
}

function formatRow(values: string[], widths: number[]): string {
  const cells = values.map((value, index) => ` ${padRight(value, widths[index] ?? value.length)} `);
  return `|${cells.join("|")}|`;
}

function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) => {
    const rowWidths = rows.map((row) => (row[index] ?? "").length);
    return Math.max(visibleLength(header), ...rowWidths, 0);
  });

  const border = `+${widths.map((width) => "-".repeat(width + 2)).join("+")}+`;
  const lines = [border, formatRow(headers, widths), border];

  for (const row of rows) {
    lines.push(formatRow(row, widths));
  }

  lines.push(border);
  return lines.join("\n");
}

function renderIssueTable(issue: Issue, index: number): string {
  const path = issue.trace && issue.trace.length > 0 ? issue.trace.join(" -> ") : issue.file;

  const rows = [
    ["#", `${index}`],
    ["Severity", issue.severity],
    ["File", issue.file],
    ["Line", `${issue.line}`],
    ["Title", issue.title],
    ["Message", issue.message],
    ["Suggestion", issue.suggestion],
    ["Variable", issue.variableName],
    ["Path", path]
  ];

  return formatTable(["Field", "Value"], rows);
}

function renderSummaryTable(report: ScanReport): string {
  const rows = [
    ["HIGH", `${report.summary.high}`, "Blocks CI when configured"],
    ["MEDIUM", `${report.summary.medium}`, "Review before merge"],
    ["LOW", `${report.summary.low}`, "Track and clean up"],
    ["INFO", `${report.summary.info}`, "Informational only"]
  ];

  return formatTable(["Severity", "Count", "Meaning"], rows);
}

function colorizeSummaryTable(table: string): string {
  return table
    .replace(/\bHIGH\b/g, SEVERITY_STYLES.HIGH("HIGH"))
    .replace(/\bMEDIUM\b/g, SEVERITY_STYLES.MEDIUM("MEDIUM"))
    .replace(/\bLOW\b/g, SEVERITY_STYLES.LOW("LOW"))
    .replace(/\bINFO\b/g, SEVERITY_STYLES.INFO("INFO"));
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
    lines.push(pc.bold("Issues"));
    lines.push("");

    report.issues.forEach((issue, index) => {
      lines.push(renderIssueTable(issue, index + 1));
      if (index < report.issues.length - 1) {
        lines.push("");
      }
    });
  }

  lines.push("");
  lines.push(pc.bold("Summary"));
  lines.push("");
  lines.push(colorizeSummaryTable(renderSummaryTable(report)));
  lines.push("");
  lines.push(`Exit code: ${report.failOn.length > 0 ? "1 when an issue matches failOn, otherwise 0" : "0"}`);

  return lines.join("\n");
}
