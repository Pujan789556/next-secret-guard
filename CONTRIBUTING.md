# Contributing

Thanks for helping improve `next-secret-guard`.

## What to focus on

- Keep the project narrow: Next.js secret-exposure guardrails.
- Prefer clear, actionable findings over noisy heuristics.
- Avoid turning the tool into a general-purpose SAST platform.

## Local workflow

1. Install dependencies.
2. Make your change.
3. Run the test suite.
4. Run the build.
5. Verify the package tarball before release.

Useful commands:

```bash
npm test
npm run build
npm pack --dry-run
```

## Release checklist

Before publishing a release:

- Bump the version in `package.json`.
- Update `CHANGELOG.md`.
- Run `npm test`.
- Run `npm run build`.
- Run `npm pack --dry-run`.
- Confirm the tarball only contains the intended files.
- Publish using the GitHub Actions workflow or a trusted publishing flow.

## Pull requests

- Keep PRs focused.
- Add or update tests when behavior changes.
- Explain the risk being addressed by the change.
- Call out any breaking changes clearly.

## Code style

- Use TypeScript.
- Keep the scanner implementation simple and maintainable.
- Prefer small, explicit heuristics over complex parsing.
