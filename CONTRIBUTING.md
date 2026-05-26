# Contributing

Thanks for helping improve `next-secret-guard`.

We appreciate bug reports, rule ideas, documentation improvements, and focused pull requests that make the scanner more useful without making it noisy.

## Local setup

```bash
npm install
```

## Run tests

```bash
npm run test
```

## Build

```bash
npm run build
```

## Run the CLI locally

```bash
npm run dev
```

## Report false positives

If `next-secret-guard` flags code that is actually safe, please open an issue with:

- the smallest possible reproduction
- the reported file and line
- the scanner output
- why the pattern is safe in your case

False-positive reports help us tune the rules while keeping the tool practical for real Next.js apps.

## Propose new rules

When suggesting a new rule or preset, include:

- the risk you want to catch
- a short example of risky code
- why the rule is specific to Next.js secret exposure
- how we can keep the signal high and the noise low

## Pull request guidelines

- Keep PRs focused and easy to review.
- Add or update tests when behavior changes.
- Update docs when user-facing behavior changes.
- Explain the security impact of the change.
- Prefer small, explicit heuristics over complex parsing.

## Versioning

This project uses semantic versioning with release automation based on conventional commits:

- `fix:` for patch releases
- `feat:` for minor releases
- `feat!:` or `BREAKING CHANGE:` for major releases

Keep commit messages and PR titles aligned with the kind of release you want the change to drive.

## Release checklist

Before a release, run:

```bash
npm run test
npm run build
npm pack --dry-run
```
