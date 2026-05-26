import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { detectEnvIssues } from "../src/scanner/env-detector";

test("detectEnvIssues flags secret-like NEXT_PUBLIC values and server-only env names", () => {
  const source = readFileSync(path.resolve("tests/fixtures/env-detector/app/page.tsx"), "utf8");
  const issues = detectEnvIssues({
    file: "app/page.tsx",
    source
  });

  expect(issues).toHaveLength(3);
  expect(issues.map((issue) => issue.variableName)).toEqual([
    "NEXT_PUBLIC_SECRET",
    "NEXT_PUBLIC_SERVICE_ROLE_KEY",
    "DATABASE_URL"
  ]);
});
