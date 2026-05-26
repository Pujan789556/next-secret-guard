# next-secret-guard

![npm version](https://img.shields.io/npm/v/next-secret-guard)
![npm downloads](https://img.shields.io/npm/dm/next-secret-guard)
![license](https://img.shields.io/npm/l/next-secret-guard)
![CI](https://github.com/Pujan789556/next-secret-guard/actions/workflows/ci.yml/badge.svg)

> CLI-first guardrails for accidental secret exposure in Next.js apps.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

`next-secret-guard` catches the kinds of mistakes that most often turn private values into client-reachable code in a Next.js app:

- environment variables used in the wrong place
- `NEXT_PUBLIC_` values that look suspiciously sensitive
- server-only modules imported into Client Component reachability paths
- shared utilities that accidentally drag secret-bearing code toward the browser bundle

It is designed for real-world Next.js apps, not as a generic env validator, not as a replacement for Next.js, ESLint, or a full security scanner, and not as a substitute for code review. It is a fast, CLI-first preflight check that helps teams catch risky patterns before they ship.

## Project status

`next-secret-guard` is in early active development. The current release focuses on practical static checks for common Next.js secret exposure mistakes. APIs, rules, and configuration may evolve before v1.0.0.

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

## What it does

`next-secret-guard` scans your codebase for practical secret-exposure risks and reports them with severity levels so teams can prioritize fixes:

- suspicious `process.env` usage in Client Components
- server-only module reachability from client-side code
- risky `NEXT_PUBLIC_*` naming patterns
- provider-specific secret patterns for Supabase, Stripe, Prisma, OpenAI, and Auth.js / Clerk-style setups

## Install

```bash
npm install -D next-secret-guard
```

Other package managers:

```bash
pnpm add -D next-secret-guard
yarn add -D next-secret-guard
bun add -d next-secret-guard
```

## Try it now

Run a scan from the root of your Next.js project:

```bash
npx next-secret-guard scan
```

Interactive example:

```text
$ npx next-secret-guard scan

next-secret-guard scan

Root: /Users/me/my-next-app
Files scanned: 42
Fail on: HIGH, MEDIUM
Issues found: 1

Issues

+---------+----------------------------------------------------------------------------------+
| Field   | Value                                                                            |
+---------+----------------------------------------------------------------------------------+
| #       | 1                                                                                |
| Severity | HIGH                                                                             |
| File    | components/UserTable.tsx                                                         |
| Line    | 4                                                                                |
| Title   | Client component reaches server-only module                                      |
| Message | Reachability path: components/UserTable.tsx -> src/lib/users.ts -> src/server/db.ts |
| Suggestion | Move server-only code behind a server action, route handler, or server component boundary. |
| Variable | src/server/db.ts                                                                 |
| Path    | components/UserTable.tsx -> src/lib/users.ts -> src/server/db.ts                |
+---------+----------------------------------------------------------------------------------+

Summary

+----------+-------+---------------------------+
| Severity | Count | Meaning                   |
+----------+-------+---------------------------+
| HIGH     | 1     | Blocks CI when configured |
| MEDIUM   | 0     | Review before merge       |
| LOW      | 0     | Track and clean up        |
| INFO     | 0     | Informational only        |
+----------+-------+---------------------------+

Exit code: 1 when an issue matches failOn, otherwise 0
```

Switch to JSON for automation:

```bash
npx next-secret-guard scan --json
```

Use CI mode to make the command fail when issues meet your configured threshold:

```bash
npx next-secret-guard scan --ci
```

## Quick start

If you want the shortest possible path:

```bash
npx next-secret-guard scan --root .
```

If your repository uses a config file:

```bash
npx next-secret-guard scan --config next-secret-guard.config.ts
```

## Code preview: risky patterns detected

The examples below are intentionally unsafe and are shown only to demonstrate what `next-secret-guard` can detect.

### 1. Secret used inside a Client Component

```tsx
"use client";

export function RiskyClientComponent() {
  // Risky: Client Components run in the browser.
  // Server-only secrets must not be referenced here.
  console.log(process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(process.env.STRIPE_SECRET_KEY);
  console.log(process.env.DATABASE_URL);

  return <div>Risky client component</div>;
}
```

This is risky because `"use client"` marks the component as client-side code. Server-only secrets should be moved to Route Handlers, Server Actions, Server Components, or backend services.

Expected scanner output:

```text
✖ HIGH  Secret used in Client Component
  File: components/RiskyClientComponent.tsx
  Variable: SUPABASE_SERVICE_ROLE_KEY
  Suggestion: Move this logic to a server-only module, Route Handler, or Server Action.
```

### 2. Dangerous `NEXT_PUBLIC_*` secret name

```env
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_fake_public_key

# Risky: NEXT_PUBLIC_* variables are exposed to the browser bundle.
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_test_do_not_use_this
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=fake_service_role_key_do_not_use
```

`NEXT_PUBLIC_*` should only be used for values that are safe to expose publicly. Publishable keys are okay. Secret keys, service role keys, private tokens, and database credentials are not okay.

Expected scanner output:

```text
✖ HIGH  Dangerous public environment variable
  File: .env.example
  Variable: NEXT_PUBLIC_STRIPE_SECRET_KEY
  Suggestion: Remove NEXT_PUBLIC_ from secrets. Only expose publishable/public keys.
```

### 3. Supabase service role key misuse

```ts
// Risky demo:
// Supabase service role keys bypass Row Level Security.
// Keep them in server-only modules, Route Handlers, or backend services.

export function createRiskySupabaseAdminClient() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
```

Supabase service role keys must never be reachable from client-side code. Admin clients should live in files like `src/server/supabase-admin.ts`. Add `import "server-only";` when using Next.js App Router.

Safe version:

```ts
import "server-only";

export function createSupabaseAdminClient() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
```

### 4. Stripe secret key misuse

```ts
// Risky demo:
// Stripe secret keys must remain server-side.

export function createRiskyStripeClient() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY,
  };
}
```

Stripe secret keys can access sensitive payment operations. Use secret keys only in Route Handlers, Server Actions, or backend services. Client-side code should use publishable keys only.

Safe public variable example:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_fake_public_key
STRIPE_SECRET_KEY=sk_test_fake_secret_key
```

### 5. Prisma `DATABASE_URL` misuse

```ts
// Risky demo:
// DATABASE_URL gives direct access to your database.
// Prisma/database connections must stay server-side.

export function createRiskyDatabaseConnection() {
  return {
    databaseUrl: process.env.DATABASE_URL,
  };
}
```

`DATABASE_URL` should never be imported into Client Components. Prisma should only run on the server. Keep database clients inside server-only modules.

Safe structure example:

```text
src/
  server/
    db.ts        # Prisma client here
  app/
    api/
      users/
        route.ts # Uses server/db.ts safely
```

### Example full scanner output

```bash
npx next-secret-guard scan
```

```text
✖ HIGH  Secret used in Client Component
  File: components/RiskyClientComponent.tsx
  Variable: SUPABASE_SERVICE_ROLE_KEY
  Suggestion: Move this logic to a server-only module, Route Handler, or Server Action.

✖ HIGH  Dangerous public environment variable
  File: .env.example
  Variable: NEXT_PUBLIC_STRIPE_SECRET_KEY
  Suggestion: Remove NEXT_PUBLIC_ from secrets. Only expose publishable/public keys.

✖ HIGH  Supabase service role key misuse
  File: lib/risky-supabase-client.ts
  Variable: SUPABASE_SERVICE_ROLE_KEY
  Suggestion: Keep service role usage in server-only files.

✖ HIGH  Stripe secret key misuse
  File: lib/risky-stripe-client.ts
  Variable: STRIPE_SECRET_KEY
  Suggestion: Use Stripe secret keys only in server-side code.

✖ HIGH  Prisma DATABASE_URL misuse
  File: lib/risky-prisma-client.ts
  Variable: DATABASE_URL
  Suggestion: Keep Prisma and database connections on the server.
```

The exact output may differ depending on the installed version of `next-secret-guard`.

### Safe usage summary

| Risky pattern | Safer approach |
|---|---|
| `process.env.SECRET_KEY` inside `"use client"` | Move logic to a Server Component, Server Action, Route Handler, or backend service |
| `NEXT_PUBLIC_STRIPE_SECRET_KEY` | Use `STRIPE_SECRET_KEY` only on the server |
| `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | Use service role key only in a server-only admin client |
| `DATABASE_URL` imported by client code | Keep Prisma/database code under `src/server` |
| Shared lib file with secrets | Split into `lib/public-*` and `server/*` modules |

Safe public config example:

```ts
export const publicConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};
```

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

## CLI usage

Typical commands:

```bash
npx next-secret-guard scan
npx next-secret-guard scan --json
npx next-secret-guard scan --ci
npx next-secret-guard scan --preset supabase
npx next-secret-guard scan --preset supabase,stripe
npx next-secret-guard scan --config .next-secret-guard.json
```

Useful flags:

- `--root <path>` scan a different project root
- `--ci` exit with code 1 when findings match the configured `failOn` severities
- `--json` print a JSON report
- `--preset <name>` enable one or more provider presets
- `--fail-on <severity>` override the configured CI threshold for a specific run
- `--config <path>` load a custom config file

Example: override the CI threshold for a specific run:

```bash
npx next-secret-guard scan --ci --fail-on HIGH
```

Example: run a full scan and output JSON for automation:

```bash
npx next-secret-guard scan --json > secret-guard-report.json
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

`next-secret-guard` loads config automatically from the project root in this order:

1. `next-secret-guard.config.ts`
2. `next-secret-guard.config.mjs`
3. `next-secret-guard.config.js`
4. `.next-secret-guard.json`

You can also point the CLI at an explicit file with `--config <path>`.

### Example config

```ts
export default {
  include: ["app/**/*.{ts,tsx,js,jsx}", "src/**/*.{ts,tsx,js,jsx}"],
  exclude: ["node_modules/**", ".next/**", "dist/**"],
  secretPatterns: [
    "SECRET",
    "TOKEN",
    "PRIVATE_KEY",
    "SERVICE_ROLE",
    "DATABASE_URL"
  ],
  allowedPublicEnv: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  ],
  serverOnlyPaths: [
    "src/server/**",
    "server/**"
  ],
  failOn: ["HIGH", "MEDIUM"]
}
```

### Field guide

- `include` controls which project folders and glob patterns are scanned.
- `exclude` filters out build output, dependencies, tests, or other ignored paths.
- `secretPatterns` defines the name fragments that make a `NEXT_PUBLIC_` variable suspicious.
- `allowedPublicEnv` whitelists public env names that should never be flagged.
- `serverOnlyPaths` marks path patterns that should be treated as server-only modules.
- `failOn` controls which severities cause `--ci` to exit with code 1.

### Example overrides

```ts
export default {
  exclude: ["src/legacy/**"],
  allowedPublicEnv: ["NEXT_PUBLIC_API_BASE_URL"],
  failOn: ["HIGH"]
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
next-secret-guard scan

Root: /path/to/project
Files scanned: 42
Fail on: HIGH, MEDIUM
Issues found: 4

Issues

... issue tables ...

Summary

... summary table with colored severity labels ...

Exit code: 1 when an issue matches failOn, otherwise 0
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
        run: npx next-secret-guard scan --ci
```

If you want PR-friendly JSON for annotation workflows, use:

```yaml
- name: Scan for secret exposure risks
  run: npx next-secret-guard scan --format json
```

Use `--fail-on` only if you want to override the configured CI thresholds for a specific run.

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

Before publishing, run `npm pack --dry-run` and confirm the tarball only includes `dist`, `README.md`, `LICENSE`, `SECURITY.md`, and `CHANGELOG.md` alongside the required `package.json`.

For the full contributor workflow and release checklist, see `CONTRIBUTING.md` in the repository.

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
