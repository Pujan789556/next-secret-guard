import path from "node:path";
import type { Issue, PresetDefinition } from "./types";

export const BASE_SERVER_ENV_NAMES = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_SECRET",
  "SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "CLERK_SECRET_KEY",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET"
];

const SAFE_CLIENT_ENV_NAMES = new Set(["NODE_ENV", "NEXT_RUNTIME"]);
const ENV_USAGE_PATTERN = /process\.env\.([A-Z0-9_]+)/g;
const DANGEROUS_PUBLIC_ENV_NAME_PATTERN = /^NEXT_PUBLIC_.*(?:SECRET|PRIVATE|SERVICE_ROLE|DATABASE_URL|JWT_SECRET).*$/i;
const PUBLIC_ENV_DECLARATION_PATTERN = /(?:^|\n)\s*(?:export\s+)?(?:const\s+)?([A-Z0-9_]*NEXT_PUBLIC_[A-Z0-9_]+)\s*=/g;

function lineNumberForIndex(source: string, index: number): number {
  return source.slice(0, index).split(/\r?\n/).length;
}

function buildIssueId(file: string, line: number, variableName: string): string {
  return `env:${file}:${line}:${variableName}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function secretPatternsToRegex(secretPatterns: string[]): RegExp | undefined {
  const patterns = secretPatterns
    .map((pattern) => pattern.trim())
    .filter((pattern) => Boolean(pattern));

  if (patterns.length === 0) {
    return undefined;
  }

  const escaped = patterns.map((pattern) => escapeRegExp(pattern));
  return new RegExp(escaped.join("|"), "i");
}

function isAllowedPublicEnv(variableName: string, allowedPublicEnv: string[]): boolean {
  return allowedPublicEnv.includes(variableName);
}

function isDangerousPublicEnvName(variableName: string, secretPatternRegex?: RegExp): boolean {
  return DANGEROUS_PUBLIC_ENV_NAME_PATTERN.test(variableName) || Boolean(secretPatternRegex?.test(variableName));
}

function createIssue(
  file: string,
  line: number,
  variableName: string,
  severity: Issue["severity"],
  title: string,
  message: string,
  suggestion: string
): Issue {
  return {
    id: buildIssueId(file, line, variableName),
    severity,
    title,
    message,
    file,
    line,
    variableName,
    suggestion
  };
}

export function detectEnvIssues(params: {
  file: string;
  source: string;
  serverEnvNames?: string[];
  secretPatterns?: string[];
  allowedPublicEnv?: string[];
  presets?: PresetDefinition[];
}): Issue[] {
  const { file, source } = params;
  const serverEnvNames = Array.from(
    new Set([...(params.serverEnvNames ?? BASE_SERVER_ENV_NAMES), ...(params.presets ?? []).flatMap((preset) => preset.serverEnvNames)])
  );
  const secretPatternRegex = secretPatternsToRegex(params.secretPatterns ?? []);
  const allowedPublicEnv = params.allowedPublicEnv ?? [];

  const issues: Issue[] = [];
  const seen = new Set<string>();

  for (const match of source.matchAll(ENV_USAGE_PATTERN)) {
    const variableName = match[1];
    const index = match.index ?? 0;
    const line = lineNumberForIndex(source, index);
    const key = `${variableName}:${line}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    if (SAFE_CLIENT_ENV_NAMES.has(variableName) || isAllowedPublicEnv(variableName, allowedPublicEnv)) {
      continue;
    }

    if (variableName.startsWith("NEXT_PUBLIC_")) {
      if (!isDangerousPublicEnvName(variableName, secretPatternRegex)) {
        continue;
      }

      issues.push(
        createIssue(
          file,
          line,
          variableName,
          "HIGH",
          "Dangerous public environment variable",
          `process.env.${variableName} looks like a secret or token, but it is prefixed with NEXT_PUBLIC_ and may be exposed to the browser bundle.`,
          "Remove NEXT_PUBLIC_ from secrets. Only expose publishable/public keys."
        )
      );
      continue;
    }

    if (serverEnvNames.includes(variableName) || (secretPatternRegex && secretPatternRegex.test(variableName))) {
      issues.push(
        createIssue(
          file,
          line,
          variableName,
          "HIGH",
          "Server-only environment variable in client-reachable code",
          `process.env.${variableName} is referenced from client-reachable code.`,
          "Move this access into a server-only module, route handler, or server action."
        )
      );
      continue;
    }

    issues.push(
      createIssue(
        file,
        line,
        variableName,
        "HIGH",
        "Non-public environment variable in client-reachable code",
        `process.env.${variableName} is referenced from client-reachable code and should not be bundled for the browser.`,
        "Keep this variable on the server or expose only a derived non-sensitive value to the client."
      )
    );
  }

  return issues;
}

export function detectPublicEnvDeclarationIssues(params: {
  file: string;
  source: string;
  allowedPublicEnv?: string[];
  secretPatterns?: string[];
}): Issue[] {
  const { file, source } = params;
  const secretPatternRegex = secretPatternsToRegex(params.secretPatterns ?? []);
  const allowedPublicEnv = params.allowedPublicEnv ?? [];
  const issues: Issue[] = [];
  const seen = new Set<string>();

  for (const match of source.matchAll(PUBLIC_ENV_DECLARATION_PATTERN)) {
    const variableName = match[1];
    const index = match.index ?? 0;
    const line = lineNumberForIndex(source, index);
    const key = `${variableName}:${line}`;

    if (seen.has(key) || isAllowedPublicEnv(variableName, allowedPublicEnv)) {
      continue;
    }
    seen.add(key);

    if (!isDangerousPublicEnvName(variableName, secretPatternRegex)) {
      continue;
    }

    issues.push(
      createIssue(
        file,
        line,
        variableName,
        "HIGH",
        "Dangerous public environment variable",
        `${variableName} looks like a secret or token, but it is prefixed with NEXT_PUBLIC_ and may be exposed to the browser bundle.`,
        "Remove NEXT_PUBLIC_ from secrets. Only expose publishable/public keys."
      )
    );
  }

  return issues;
}

export function getServerEnvNamesFromPresets(presets: PresetDefinition[]): string[] {
  return Array.from(new Set(presets.flatMap((preset) => preset.serverEnvNames)));
}

export function relativeFileName(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
