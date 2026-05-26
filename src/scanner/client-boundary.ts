const CLIENT_DIRECTIVE = /^['"]use client['"];?$/;
const SERVER_ONLY_IMPORT = /import\s+['"]server-only['"];?/;
const PRISMA_IMPORT = /import\s+[^'"]*['"]@prisma\/client['"]/;
const SERVER_PATH_PATTERN = /(?:^|[\\/])server(?:[\\/]|$)/i;
const SERVER_FILE_PATTERN = /\.server\.(?:ts|tsx)$/i;
const DATABASE_URL_PATTERN = /process\.env\.DATABASE_URL/;
const SUPABASE_SERVICE_ROLE_PATTERN = /process\.env\.SUPABASE_SERVICE_ROLE_KEY/;
const STRIPE_SECRET_PATTERN = /process\.env\.STRIPE_SECRET_KEY/;
const CLERK_SECRET_PATTERN = /process\.env\.CLERK_SECRET_KEY/;
const AUTH_SECRET_PATTERN = /process\.env\.AUTH_SECRET/;

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

export function isServerOnlyModule(filePath: string, source: string): boolean {
  return (
    SERVER_PATH_PATTERN.test(filePath) ||
    SERVER_FILE_PATTERN.test(filePath) ||
    SERVER_ONLY_IMPORT.test(source) ||
    PRISMA_IMPORT.test(source) ||
    DATABASE_URL_PATTERN.test(source) ||
    SUPABASE_SERVICE_ROLE_PATTERN.test(source) ||
    STRIPE_SECRET_PATTERN.test(source) ||
    CLERK_SECRET_PATTERN.test(source) ||
    AUTH_SECRET_PATTERN.test(source)
  );
}
