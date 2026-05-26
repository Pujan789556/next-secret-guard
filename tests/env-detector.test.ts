import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { detectEnvIssues, detectPublicEnvDeclarationIssues } from "../src/scanner/env-detector";

test("detectEnvIssues flags secret-like NEXT_PUBLIC values and server-only env names", () => {
  const source = readFileSync(path.resolve("tests/fixtures/env-detector/app/page.tsx"), "utf8");
  const issues = detectEnvIssues({
    file: "app/page.tsx",
    source
  });

  expect(issues).toHaveLength(4);
  expect(issues.map((issue) => issue.variableName)).toEqual([
    "NEXT_PUBLIC_SECRET",
    "NEXT_PUBLIC_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "OPENAI_API_KEY"
  ]);
});

test("detectPublicEnvDeclarationIssues flags dangerous NEXT_PUBLIC env names in env files", () => {
  const source = readFileSync(path.resolve("tests/fixtures/public-env/.env.example"), "utf8");
  const issues = detectPublicEnvDeclarationIssues({
    file: ".env.example",
    source
  });

  expect(issues).toHaveLength(4);
  expect(issues.map((issue) => issue.variableName)).toEqual([
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_DATABASE_URL",
    "NEXT_PUBLIC_JWT_SECRET"
  ]);
});
