import { expect, test } from "vitest";
import { renderConsoleReport } from "../src/reporter/console-reporter";
import type { ScanReport } from "../src/scanner/types";

test("renderConsoleReport formats issues and summary as tables", () => {
  const report: ScanReport = {
    root: "/project",
    filesScanned: 2,
    presetsUsed: [],
    failOn: ["HIGH"],
    issues: [
      {
        id: "issue-1",
        severity: "HIGH",
        title: "Client component reaches server-only module",
        message: "Reachability path: app/page.tsx -> lib/db.ts",
        file: "app/page.tsx",
        line: 4,
        variableName: "lib/db.ts",
        suggestion: "Move server-only code behind a server action, route handler, or server component boundary."
      }
    ],
    summary: {
      high: 1,
      medium: 0,
      low: 0,
      info: 0,
      total: 1
    }
  };

  const output = renderConsoleReport(report);

  expect(output).toContain("| Field");
  expect(output).toContain("| Severity ");
  expect(output).toContain("Client component reaches server-only module");
  expect(output).toContain("Reachability path: app/page.tsx -> lib/db.ts");
  expect(output).toContain("Summary");
  expect(output).toContain("Blocks CI when configured");
});
