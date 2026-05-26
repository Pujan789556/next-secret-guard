import path from "node:path";
import { expect, test } from "vitest";
import { scanProject } from "../src/scanner/scan-project";

test("scanProject finds a client-to-server import chain", async () => {
  const report = await scanProject({
    root: path.resolve("tests/fixtures/reachability")
  });

  expect(report.summary.high).toBe(1);
  expect(report.summary.total).toBe(1);
  expect(report.issues).toHaveLength(1);
  expect(report.issues[0].title).toBe("Client component reaches server-only module");
  expect(report.issues[0].message).toContain("components/UserTable.tsx -> src/lib/users.ts -> src/server/db.ts");
  expect(report.issues[0].suggestion).toBe(
    'Move this file under src/server/ or add import "server-only" to prevent accidental client imports.'
  );
});

test("scanProject returns no findings for a cycle-only fixture", async () => {
  const report = await scanProject({
    root: path.resolve("tests/fixtures/cycle")
  });

  expect(report.summary.total).toBe(0);
  expect(report.issues).toHaveLength(0);
});

test("scanProject handles imports that resolve through a directory index file", async () => {
  const report = await scanProject({
    root: path.resolve("tests/fixtures/directory-import")
  });

  expect(report.summary.total).toBe(0);
  expect(report.issues).toHaveLength(0);
});

test("scanProject flags dangerous NEXT_PUBLIC env declarations in root env files", async () => {
  const report = await scanProject({
    root: path.resolve("tests/fixtures/public-env")
  });

  expect(report.summary.high).toBe(4);
  expect(report.summary.total).toBe(4);
  expect(report.issues.map((issue) => issue.variableName)).toEqual([
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_DATABASE_URL",
    "NEXT_PUBLIC_JWT_SECRET"
  ]);
});
