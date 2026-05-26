const CLIENT_DIRECTIVE = /^['"]use client['"];?$/;
const SERVER_ONLY_IMPORT = /import\s+['"]server-only['"];?/;
const PRISMA_IMPORT = /import\s+[^'"]*['"]@prisma\/client['"]/;
const DATABASE_URL_PATTERN = /process\.env\.DATABASE_URL/;
const SUPABASE_SERVICE_ROLE_PATTERN = /process\.env\.SUPABASE_SERVICE_ROLE_KEY/;
const STRIPE_SECRET_PATTERN = /process\.env\.STRIPE_SECRET_KEY/;
const CLERK_SECRET_PATTERN = /process\.env\.CLERK_SECRET_KEY/;
const AUTH_SECRET_PATTERN = /process\.env\.AUTH_SECRET/;

const DEFAULT_SERVER_ONLY_PATTERNS = ["server/**", "src/server/**"];

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function globToRegExp(glob: string): RegExp {
  const normalized = toPosixPath(glob).replace(/^\.?\//, "");
  const escaped = escapeRegExp(normalized)
    .replace(/\*\*/g, "::DOUBLE_STAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/::DOUBLE_STAR::/g, ".*");

  return new RegExp(`^${escaped}$`);
}

function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  const normalized = toPosixPath(filePath).replace(/^\.?\//, "");
  return patterns.some((pattern) => globToRegExp(pattern).test(normalized));
}

export function isClientComponentSource(source: string): boolean {
  const topLines = source.split(/\r?\n/).slice(0, 12);

  for (const line of topLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
      continue;
    }

    return CLIENT_DIRECTIVE.test(trimmed);
  }

  return false;
}

export function isServerOnlySource(source: string): boolean {
  return SERVER_ONLY_IMPORT.test(source);
}

export function isServerOnlyModule(filePath: string, source: string, serverOnlyPaths: string[] = DEFAULT_SERVER_ONLY_PATTERNS): boolean {
  const pathSignals = matchesAnyPattern(filePath, serverOnlyPaths) || /(?:^|[\\/])server(?:[\\/]|$)/i.test(filePath) || /\.server\.(?:ts|tsx|js|jsx)$/i.test(filePath);

  return (
    pathSignals ||
    SERVER_ONLY_IMPORT.test(source) ||
    PRISMA_IMPORT.test(source) ||
    DATABASE_URL_PATTERN.test(source) ||
    SUPABASE_SERVICE_ROLE_PATTERN.test(source) ||
    STRIPE_SECRET_PATTERN.test(source) ||
    CLERK_SECRET_PATTERN.test(source) ||
    AUTH_SECRET_PATTERN.test(source)
  );
}
