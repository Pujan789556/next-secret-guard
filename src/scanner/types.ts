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
  failOn: Severity[];
  issues: Issue[];
  summary: ScanSummary;
}

export interface ScannerConfig {
  include: string[];
  exclude: string[];
  secretPatterns: string[];
  allowedPublicEnv: string[];
  serverOnlyPaths: string[];
  failOn: Severity[];
  presets: string[];
  framework?: string;
}

export interface ConfigFileInput {
  include?: string[];
  exclude?: string[];
  secretPatterns?: string[];
  allowedPublicEnv?: string[];
  serverOnlyPaths?: string[];
  failOn?: Severity[];
  presets?: string[];
  framework?: string;
}

export interface LoadConfigOptions {
  root: string;
  configPath?: string;
  presets?: string[];
  failOn?: Severity[];
}

export interface ScanProjectOptions {
  root?: string;
  configPath?: string;
  presets?: string[];
  failOn?: Severity[];
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
