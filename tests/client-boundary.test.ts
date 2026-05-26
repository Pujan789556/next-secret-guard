import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { buildImportGraph, collectReachableFiles } from "../src/scanner/import-graph";
import { isClientComponentSource, isServerOnlyModule } from "../src/scanner/client-boundary";

test("client boundary helpers identify client and server-only sources", () => {
  const clientSource = readFileSync(path.resolve("tests/fixtures/reachability/components/UserTable.tsx"), "utf8");
  const serverSource = readFileSync(path.resolve("tests/fixtures/reachability/src/server/db.ts"), "utf8");

  expect(isClientComponentSource(clientSource)).toBe(true);
  expect(isServerOnlyModule("src/server/db.ts", serverSource)).toBe(true);
  expect(isServerOnlyModule("src/server/db.ts", 'export const url = process.env.DATABASE_URL;')).toBe(true);
  expect(isServerOnlyModule("src/server/db.ts", 'import { PrismaClient } from "@prisma/client";')).toBe(true);
});

test("import graph resolves alias imports and reachable files from a client root", () => {
  const root = path.resolve("tests/fixtures/reachability");
  const files = [
    path.resolve(root, "components/UserTable.tsx"),
    path.resolve(root, "src/lib/users.ts"),
    path.resolve(root, "src/server/db.ts")
  ];
  const graph = buildImportGraph(files, root);
  const reachable = collectReachableFiles(graph, [files[0]]);

  expect(reachable.has(files[0])).toBe(true);
  expect(reachable.has(files[1])).toBe(true);
  expect(reachable.has(files[2])).toBe(true);
  expect(graph.get(files[0])?.[0]?.target).toBe(files[1]);
  expect(graph.get(files[1])?.[0]?.target).toBe(files[2]);
});
