import type { ScannerConfig } from "../scanner/types";

export const DEFAULT_INCLUDE = ["app", "pages", "components", "src", "lib"];
export const DEFAULT_EXCLUDE = ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/coverage/**"];

export const DEFAULT_CONFIG: ScannerConfig = {
  include: DEFAULT_INCLUDE,
  exclude: DEFAULT_EXCLUDE,
  presets: [],
  failOn: "HIGH",
  checks: {
    publicEnvUsage: true,
    clientBoundaryImports: true,
    serverOnlyModuleReachability: true
  }
};
