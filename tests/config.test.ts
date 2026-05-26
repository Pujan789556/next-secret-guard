import path from "node:path";
import { expect, test } from "vitest";
import { loadConfig } from "../src/config/load-config";
import { detectEnvIssues } from "../src/scanner/env-detector";

test("loadConfig discovers the default TS config file and merges it with defaults", async () => {
  const config = await loadConfig({
    root: path.resolve("tests/fixtures/config-search")
  });

  expect(config.include).toEqual(expect.arrayContaining(["app", "pages", "components", "src", "lib"]));
  expect(config.secretPatterns).toEqual(expect.arrayContaining(["SECRET", "TOKEN", "PRIVATE_KEY", "SERVICE_ROLE", "DATABASE_URL"]));
  expect(config.allowedPublicEnv).toEqual(expect.arrayContaining(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]));
  expect(config.serverOnlyPaths).toEqual(expect.arrayContaining(["src/server/**", "server/**"]));
  expect(config.failOn).toEqual(["HIGH", "MEDIUM"]);
});

test("loadConfig discovers the JSON config file when no TS config exists", async () => {
  const config = await loadConfig({
    root: path.resolve("tests/fixtures/config-json")
  });

  expect(config.include).toEqual(expect.arrayContaining(["custom-app/**/*.{ts,tsx,js,jsx}", "app", "src"]));
  expect(config.exclude).toEqual(expect.arrayContaining(["ignored/**"]));
  expect(config.allowedPublicEnv).toContain("NEXT_PUBLIC_JSON_ONLY");
  expect(config.serverOnlyPaths).toContain("json-server/**");
  expect(config.failOn).toEqual(["HIGH"]);
});

test("loadConfig supports an explicit config path", async () => {
  const config = await loadConfig({
    root: path.resolve("tests/fixtures/config-search"),
    configPath: path.resolve("tests/fixtures/config-explicit/custom-config.mjs")
  });

  expect(config.include).toEqual(expect.arrayContaining(["pages", "src"]));
  expect(config.allowedPublicEnv).toContain("NEXT_PUBLIC_CUSTOM_URL");
  expect(config.serverOnlyPaths).toContain("custom/server/**");
  expect(config.failOn).toEqual(["HIGH"]);
});

test("allowed public env names suppress false positives", () => {
  const issues = detectEnvIssues({
    file: "app/page.tsx",
    source: [
      "\"use client\";",
      "const a = process.env.NEXT_PUBLIC_SUPABASE_URL;",
      "const b = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;"
    ].join("\n"),
    secretPatterns: ["SECRET", "TOKEN", "PRIVATE_KEY", "SERVICE_ROLE", "DATABASE_URL"],
    allowedPublicEnv: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]
  });

  expect(issues).toHaveLength(0);
});
