import type { Issue, Severity, ScanSummary } from "./types";

export type { Severity } from "./types";

export const SEVERITY_ORDER: Severity[] = ["HIGH", "MEDIUM", "LOW", "INFO"];

const SEVERITY_RANK: Record<Severity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  INFO: 3
};

export function compareSeverity(left: Severity, right: Severity): number {
  return SEVERITY_RANK[left] - SEVERITY_RANK[right];
}

export function parseSeverity(input: string | undefined): Severity {
  const normalized = (input ?? "").trim().toUpperCase();

  if (normalized === "HIGH" || normalized === "MEDIUM" || normalized === "LOW" || normalized === "INFO") {
    return normalized;
  }

  return "HIGH";
}

export function severityMeetsThreshold(severity: Severity, threshold: Severity): boolean {
  return SEVERITY_RANK[severity] <= SEVERITY_RANK[threshold];
}

export function summarizeIssues(issues: Issue[]): ScanSummary {
  const summary: ScanSummary = {
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    total: issues.length
  };

  for (const issue of issues) {
    switch (issue.severity) {
      case "HIGH":
        summary.high += 1;
        break;
      case "MEDIUM":
        summary.medium += 1;
        break;
      case "LOW":
        summary.low += 1;
        break;
      case "INFO":
        summary.info += 1;
        break;
    }
  }

  return summary;
}

export function shouldFailScan(issues: Issue[]): boolean {
  return issues.some((issue) => issue.severity === "HIGH" || issue.severity === "MEDIUM");
}

export function shouldFailOnSeverity(issues: Issue[], threshold: Severity): boolean {
  return issues.some((issue) => severityMeetsThreshold(issue.severity, threshold));
}

export function shouldFailOnSeverities(issues: Issue[], thresholds: Severity[]): boolean {
  return thresholds.some((threshold) => shouldFailOnSeverity(issues, threshold));
}
