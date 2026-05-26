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
  expect(report.issues[0].message).toBe("Server-only module is reachable from a Client Component.");
  expect(report.issues[0].suggestion).toBe(
    'Move this file under src/server/ or add import "server-only" to prevent accidental client imports.'
  );
  expect(report.issues[0].trace).toEqual([
    "components/UserTable.tsx",
    "src/lib/users.ts",
    "src/server/db.ts"
  ]);
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

test("scanProject traces through barrel exports to server-only secrets", async () => {
  const report = await scanProject({
    root: path.resolve("tests/fixtures/import-trace")
  });

  expect(report.summary.high).toBe(1);
  expect(report.summary.total).toBe(1);
  expect(report.issues).toHaveLength(1);
  expect(report.issues[0].title).toBe("Client component reaches server-only secret");
  expect(report.issues[0].variableName).toBe("SUPABASE_SERVICE_ROLE_KEY");
  expect(report.issues[0].message).toBe("SUPABASE_SERVICE_ROLE_KEY is reachable from a Client Component.");
  expect(report.issues[0].trace).toEqual([
    "components/UserTable.tsx",
    "src/lib/supabase.ts",
    "src/lib/supabase-admin.ts"
  ]);
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
