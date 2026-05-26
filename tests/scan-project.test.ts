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
