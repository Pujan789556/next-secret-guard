# next-secret-guard

CLI-first guardrails for Next.js secret exposure.

`next-secret-guard` helps catch a very specific class of mistakes that can turn private values into client-reachable code: environment variables used in the wrong place, server-only modules pulled into client boundaries, and other accidental paths that make secrets easier to leak than they should be.

It is designed for real-world Next.js apps, not as a generic env validator, not as a replacement for Next.js, ESLint, or a full security scanner, and not as a substitute for code review. It is a fast preflight check that helps teams catch risky patterns before they ship.

## Introduction

Next.js makes server/client boundaries powerful, but also easy to misunderstand. A variable prefixed with `NEXT_PUBLIC_` is intentionally exposed to the browser bundle. A server-only module can become indirectly reachable from a Client Component if the import graph is not carefully separated. A single mistaken import can move sensitive logic into code that runs on the client.

`next-secret-guard` scans for those practical mistakes and reports them with clear severity levels so developers can fix issues before production.

## Why this exists

Secret leaks in Next.js rarely happen because someone deliberately published a credential. They usually happen because a developer:

- assumes an environment variable is server-only when it is not
- uses `NEXT_PUBLIC_` for something that should stay private
- imports a server helper into a shared module that later becomes reachable from `"use client"`
- moves code during a refactor and accidentally crosses the server/client boundary
- ships a feature quickly and does not notice that a secret ended up in a browser-accessible path

The cost of these mistakes can be high:

- API keys can be extracted from shipped JavaScript
- database credentials can be abused for unauthorized reads or writes
- third-party billing, identity, or AI APIs can be charged or manipulated
- private user data can be exposed through downstream access
- incident response becomes slower because the leak is embedded in deployed client code

This package exists to reduce that risk in the part of the workflow where it is easiest to prevent: before merge, before deploy, and before production traffic sees it.

## What can go wrong?

Here are a few common failure modes in Next.js applications:

- A secret is placed in `NEXT_PUBLIC_*` so it can be used by the browser, but the value was never meant to be public.
- A module that reads server-only environment variables is imported by a file that later becomes part of a Client Component subtree.
- A utility file is shared across server and client code, so a server-only dependency gets dragged into the browser bundle indirectly.
- A package that should only run on the server is accessed from code that is eventually bundled for the client.

The result is not always an obvious "leak" in the source code. Often the problem is that secret-bearing code becomes reachable from the browser bundle or from client-side execution paths.

## What it detects

`next-secret-guard` is focused on the most common Next.js secret-exposure mistakes:

- `NEXT_PUBLIC_` variables used for values that look sensitive
- suspicious server-only environment variable usage in code that can reach the client bundle
- import chains that connect Client Components to server-only modules
- cross-boundary dependency paths that make server logic reachable from client code
- provider-specific risky patterns for common services such as Supabase, Stripe, Prisma, OpenAI, and Clerk/Auth.js style auth helpers

Severity is reported so teams can prioritize the riskiest issues first.

## What it does not detect

This package is intentionally narrow.

It does not:

- replace Next.js build-time protections
- replace ESLint, TypeScript, or code review
- perform full static application security testing
- prove that a secret has been exfiltrated
- scan infrastructure, deployment logs, or runtime telemetry
- detect every possible security flaw in your application
- validate that all secrets are properly rotated or stored in a vault

Treat it as a guardrail, not a complete security audit.

## Installation

```bash
npm install -D next-secret-guard
```

Or with other package managers:

```bash
pnpm add -D next-secret-guard
yarn add -D next-secret-guard
bun add -d next-secret-guard
```

## Quick start

Run the scanner from the project root:

```bash
npx next-secret-guard
```

Or run an explicit scan command if your setup prefers subcommands:

```bash
npx next-secret-guard scan
```

If you want machine-readable output for CI:

```bash
npx next-secret-guard scan --format json
```

## CLI usage

Typical commands:

```bash
npx next-secret-guard
npx next-secret-guard scan
npx next-secret-guard scan --format json
npx next-secret-guard scan --fail-on high
npx next-secret-guard scan --config .next-secret-guard.json
```

Useful flags:

- `--config <path>` load a custom config file
- `--format text|json` choose human-readable or machine-readable output
- `--fail-on <severity>` fail the process at a chosen threshold
- `--ignore <pattern>` ignore files or directories for known-safe cases
- `--include <pattern>` scope scanning to specific paths

Example: fail only on high-severity findings during local development, but keep informational findings visible:

```bash
npx next-secret-guard scan --fail-on high
```

Example: run a full scan and output JSON for automation:

```bash
npx next-secret-guard scan --format json > secret-guard-report.json
```

## Example: Supabase service role leak

### Risky code

```ts
// lib/supabase-admin.ts
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function createAdminClient() {
  return {
    key: supabaseServiceRoleKey,
  };
}
```

```tsx
// app/components/Settings.tsx
"use client";

import { createAdminClient } from "@/lib/supabase-admin";

export function Settings() {
  void createAdminClient();
  return <div>Settings</div>;
}
```

Why this is risky:

- the service role key should never be reachable from client code
- importing `supabase-admin.ts` into a Client Component creates a dangerous boundary crossing

### Fixed code

```ts
// lib/supabase-admin.ts
import "server-only";

export async function createAdminClient() {
  return {
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
```

```tsx
// app/components/Settings.tsx
"use client";

export function Settings() {
  return <div>Settings</div>;
}
```

Move the admin action behind a server action, route handler, or server component boundary instead of importing it into client code.

## Example: server-only module imported by a Client Component

### Risky code

```ts
// lib/server-secrets.ts
export const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
export const openAIKey = process.env.OPENAI_API_KEY;
```

```ts
// lib/index.ts
export * from "./server-secrets";
```

```tsx
// app/components/Billing.tsx
"use client";

import { stripeSecretKey } from "@/lib";

export function Billing() {
  return <div>{stripeSecretKey ? "Ready" : "Not ready"}</div>;
}
```

### Fixed code

```ts
// lib/server-secrets.ts
import "server-only";

export const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
export const openAIKey = process.env.OPENAI_API_KEY;
```

```ts
// lib/index.ts
export * from "./public-helpers";
```

```tsx
// app/components/Billing.tsx
"use client";

export function Billing() {
  return <div>Billing UI</div>;
}
```

Keep server-only exports out of shared barrels that can be imported by client-side code.

## Configuration

You can keep configuration in a JSON file at the project root.

### `.next-secret-guard.json`

```json
{
  "include": ["app", "src", "lib"],
  "exclude": ["**/*.test.*", "**/*.spec.*", "node_modules"],
  "failOn": "high",
  "framework": "nextjs",
  "checks": {
    "publicEnvUsage": true,
    "clientBoundaryImports": true,
    "serverOnlyModuleReachability": true,
    "providerPresets": ["supabase", "stripe", "prisma", "openai", "clerk", "authjs"]
  }
}
```

### Example overrides

```json
{
  "failOn": "medium",
  "ignore": ["src/legacy/**"],
  "checks": {
    "providerPresets": ["supabase", "stripe", "openai"]
  }
}
```

## Severity levels

Findings are grouped so you can triage quickly.

- `HIGH`: likely secret exposure or direct client reachability of sensitive material
- `MEDIUM`: a risky import or boundary pattern that could expose secrets in a common refactor path
- `LOW`: a pattern that is probably safe today but deserves attention
- `INFO`: informational guidance or a non-blocking recommendation

Suggested policy:

- fail CI on `HIGH`
- review `MEDIUM` before merge
- surface `LOW` and `INFO` in PR comments or local scans

## Expected CLI output

Example text output:

```text
next-secret-guard v0.1.0

Scanning 42 files...

HIGH  app/components/Settings.tsx
  Client Component imports lib/supabase-admin.ts
  Sensitive server-only value may become reachable from browser code

MEDIUM lib/index.ts
  Barrel export includes server-only module lib/server-secrets.ts
  Shared entrypoint can widen client reachability

LOW   lib/public-helpers.ts
  File name suggests shared usage; verify it does not import server-only dependencies

INFO  app/page.tsx
  No risky public env usage found in this file

Summary: 1 high, 1 medium, 1 low, 1 info
Exit code: 1
```

Example JSON output:

```json
{
  "summary": {
    "filesScanned": 42,
    "high": 1,
    "medium": 1,
    "low": 1,
    "info": 1
  },
  "findings": [
    {
      "severity": "HIGH",
      "file": "app/components/Settings.tsx",
      "message": "Client Component imports lib/supabase-admin.ts",
      "ruleId": "client-boundary-import"
    }
  ]
}
```

## CI usage

GitHub Actions example:

```yaml
name: Secret Guard

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Scan for secret exposure risks
        run: npx next-secret-guard scan --fail-on high
```

If you want PR-friendly JSON for annotation workflows, use:

```yaml
- name: Scan for secret exposure risks
  run: npx next-secret-guard scan --format json
```

## Provider presets

The tool includes provider-aware checks for common Next.js stacks.

### Supabase

What to watch for:

- `SUPABASE_SERVICE_ROLE_KEY` in any code that can be reached from the client
- server admin helpers imported into shared barrels
- client components indirectly importing server-only Supabase helpers

Risky example:

```ts
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

Safer pattern:

```ts
import "server-only";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Stripe

What to watch for:

- `STRIPE_SECRET_KEY` imported by client-reachable code
- payment helpers shared across server and client boundaries

Risky example:

```ts
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20"
});
```

If this file is imported into client-reachable code, the secret should be considered at risk.

Safer pattern:

```ts
import "server-only";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20"
});
```

### Prisma

What to watch for:

- `DATABASE_URL` or `DIRECT_URL` in code reachable from the browser bundle
- Prisma client helpers exported from shared modules

Risky example:

```ts
export const dbUrl = process.env.DATABASE_URL;
```

Safer pattern:

```ts
import "server-only";

export const prisma = new PrismaClient();
```

### OpenAI

What to watch for:

- `OPENAI_API_KEY` in client-reachable helpers
- AI utilities that are safe for server use but accidentally imported into the browser

Risky example:

```ts
export const openaiKey = process.env.OPENAI_API_KEY;
```

Safer pattern:

```ts
import "server-only";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

### Clerk / Auth.js style secrets

What to watch for:

- `CLERK_SECRET_KEY`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, or similar secrets in client-reachable code
- auth helper modules shared across both sides of the boundary

Risky example:

```ts
export const authSecret = process.env.AUTH_SECRET;
```

Safer pattern:

```ts
import "server-only";

export const authOptions = {
  secret: process.env.AUTH_SECRET
};
```

## How it works

At a high level, `next-secret-guard` checks for:

- sensitive environment variable patterns
- import graphs that cross from client code into server-only modules
- module reachability that could pull server-only dependencies into browser bundles
- provider-specific naming patterns that commonly correspond to secrets

The goal is practical detection, not perfect proof. It is meant to be fast enough to run locally and in CI.

## Roadmap

Planned or likely future improvements:

- richer import graph analysis for larger Next.js monorepos
- better reporting for App Router and nested boundary cases
- SARIF output for code scanning platforms
- inline ignore comments for justified exceptions
- framework-aware presets for common Next.js ecosystems
- GitHub PR annotations
- support for custom rule packs

## Contributing

Contributions are welcome.

Suggested workflow:

1. Fork or branch from `main`
2. Make a focused change
3. Add or update tests if behavior changes
4. Run the scanner or test suite locally
5. Open a pull request with a clear explanation of the risk being addressed

When contributing, please keep the project scope tight:

- optimize for Next.js secret-exposure guardrails
- avoid turning the project into a generic security platform
- prefer clear, actionable findings over noisy warnings

## Security

If you discover a security issue in the package itself, please report it responsibly.

Recommended disclosure process:

1. Do not open a public issue with exploit details
2. Contact the maintainers privately with the affected file, version, and reproduction steps
3. Allow time for review, fix, and release coordination

This project is intended to reduce accidental secret exposure, but it is not a complete security audit and it cannot guarantee that a secret has not already been leaked elsewhere.

## License

MIT License.

See the `LICENSE` file if one is present in this repository.
