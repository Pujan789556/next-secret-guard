import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ImportEdge, ImportGraph } from "./types";

const STATIC_IMPORT_PATTERN = /^\s*import\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]\s*;?\s*$/;
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith(".");
}

function tryResolveCandidates(candidates: string[]): string | undefined {
  return candidates.find((candidate) => existsSync(candidate));
}

function resolveFileTarget(candidateBase: string): string | undefined {
  const candidates = [
    candidateBase,
    ...EXTENSIONS.map((extension) => `${candidateBase}${extension}`),
    ...EXTENSIONS.map((extension) => path.join(candidateBase, `index${extension}`))
  ];

  return tryResolveCandidates(candidates);
}

function resolveTarget(importer: string, specifier: string, projectRoot: string): string | undefined {
  const baseDir = path.dirname(importer);
  if (isRelativeSpecifier(specifier)) {
    return resolveFileTarget(path.resolve(baseDir, specifier));
  }

  if (specifier.startsWith("@/") || specifier.startsWith("~/")) {
    const remainder = specifier.slice(2);
    return (
      resolveFileTarget(path.resolve(projectRoot, "src", remainder)) ??
      resolveFileTarget(path.resolve(projectRoot, remainder))
    );
  }

  if (specifier.startsWith("src/")) {
    return resolveFileTarget(path.resolve(projectRoot, specifier));
  }

  return undefined;
}

function extractEdge(line: string, lineNumber: number, importer: string, projectRoot: string): ImportEdge | undefined {
  const match = line.match(STATIC_IMPORT_PATTERN);

  if (!match) {
    return undefined;
  }

  const specifier = match[1];
  const target = resolveTarget(importer, specifier, projectRoot);
  if (!target) {
    return undefined;
  }

  return {
    target,
    specifier,
    line: lineNumber
  };
}

function inferProjectRoot(files: string[]): string {
  if (files.length === 0) {
    return process.cwd();
  }

  const segments = files[0].split(path.sep);
  let root = path.dirname(files[0]);

  for (const file of files.slice(1)) {
    let candidate = "";
    const fileSegments = file.split(path.sep);
    const length = Math.min(segments.length, fileSegments.length);

    for (let index = 0; index < length; index += 1) {
      if (segments[index] !== fileSegments[index]) {
        break;
      }

      candidate = path.join(candidate || path.sep, segments[index]);
    }

    if (candidate) {
      root = candidate;
    }
  }

  return root;
}

export function buildImportGraph(files: string[], projectRoot = inferProjectRoot(files)): ImportGraph {
  const graph: ImportGraph = new Map();

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const edges: ImportEdge[] = [];

    source.split(/\r?\n/).forEach((line, index) => {
      const edge = extractEdge(line, index + 1, file, projectRoot);
      if (edge) {
        edges.push(edge);
      }
    });

    graph.set(file, edges);
  }

  return graph;
}

export function collectReachableFiles(graph: ImportGraph, roots: string[]): Set<string> {
  const visited = new Set<string>();
  const stack = [...roots];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const edge of graph.get(current) ?? []) {
      if (!visited.has(edge.target)) {
        stack.push(edge.target);
      }
    }
  }

  return visited;
}
