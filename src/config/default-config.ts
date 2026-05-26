import type { Severity, ScannerConfig } from "../scanner/types";

export const DEFAULT_INCLUDE = ["app", "pages", "components", "src", "lib"];
export const DEFAULT_EXCLUDE = ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/coverage/**"];
export const DEFAULT_SECRET_PATTERNS = ["SECRET", "TOKEN", "PRIVATE_KEY", "SERVICE_ROLE", "DATABASE_URL"];
export const DEFAULT_ALLOWED_PUBLIC_ENV: string[] = [];
export const DEFAULT_SERVER_ONLY_PATHS = ["server/**", "src/server/**"];
export const DEFAULT_FAIL_ON: Severity[] = ["HIGH", "MEDIUM"];

export const DEFAULT_CONFIG: ScannerConfig = {
  include: DEFAULT_INCLUDE,
  exclude: DEFAULT_EXCLUDE,
  secretPatterns: DEFAULT_SECRET_PATTERNS,
  allowedPublicEnv: DEFAULT_ALLOWED_PUBLIC_ENV,
  serverOnlyPaths: DEFAULT_SERVER_ONLY_PATHS,
  failOn: [...DEFAULT_FAIL_ON],
  presets: [],
};
