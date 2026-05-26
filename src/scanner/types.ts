export type Severity = "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface Issue {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  file: string;
  line: number;
  variableName: string;
  suggestion: string;
}

export interface ScanSummary {
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export interface ScanReport {
  root: string;
  filesScanned: number;
  presetsUsed: string[];
  issues: Issue[];
  summary: ScanSummary;
}

export interface ScannerChecks {
  publicEnvUsage: boolean;
  clientBoundaryImports: boolean;
  serverOnlyModuleReachability: boolean;
}

export interface ScannerConfig {
  include: string[];
  exclude: string[];
  presets: string[];
  failOn: Severity;
  framework?: string;
  checks: ScannerChecks;
}

export interface ConfigFileInput {
  include?: string[];
  exclude?: string[];
  presets?: string[];
  failOn?: Severity;
  framework?: string;
  checks?: Partial<ScannerChecks>;
}

export interface LoadConfigOptions {
  root: string;
  configPath?: string;
  presets?: string[];
}

export interface ScanProjectOptions {
  root?: string;
  configPath?: string;
  presets?: string[];
}

export interface PresetDefinition {
  name: string;
  description: string;
  serverEnvNames: string[];
}

export interface ImportEdge {
  target: string;
  specifier: string;
  line: number;
}

export type ImportGraph = Map<string, ImportEdge[]>;
