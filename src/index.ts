export { loadConfig } from "./config/load-config";
export { DEFAULT_CONFIG } from "./config/default-config";
export { discoverProjectFiles } from "./scanner/file-discovery";
export { isClientComponentSource, isServerOnlySource, isServerOnlyModule } from "./scanner/client-boundary";
export { buildImportGraph, collectReachableFiles } from "./scanner/import-graph";
export { detectEnvIssues, BASE_SERVER_ENV_NAMES } from "./scanner/env-detector";
export { scanProject } from "./scanner/scan-project";
export { renderConsoleReport } from "./reporter/console-reporter";
export {
  compareSeverity,
  parseSeverity,
  summarizeIssues,
  shouldFailOnSeverity,
  shouldFailScan,
  SEVERITY_ORDER,
  severityMeetsThreshold
} from "./scanner/severity";
export { supabasePreset } from "./presets/supabase";
export { stripePreset } from "./presets/stripe";
export { prismaPreset } from "./presets/prisma";
export { openaiPreset } from "./presets/openai";
export { authPreset } from "./presets/auth";
export type {
  ConfigFileInput,
  ImportEdge,
  ImportGraph,
  Issue,
  LoadConfigOptions,
  PresetDefinition,
  ScanProjectOptions,
  ScanReport,
  ScannerConfig,
  ScanSummary,
  Severity
} from "./scanner/types";
