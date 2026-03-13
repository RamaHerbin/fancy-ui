# Contributing to fancy-ui

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Getting started

```bash
git clone https://github.com/RamaHerbin/fancy-ui.git
cd fancy-ui
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:5173`. Component demos are at `/demo/<slug>`.

## Adding a component

1. **Copy the template** — duplicate `src/lib/fancy-ui/_template/` and rename it to your component slug (e.g. `src/lib/fancy-ui/my-component/`).

2. **Register it** — add an entry to `src/lib/fancy-ui/registry.ts`:
   ```ts
   "my-component": {
     name: "MyComponent",
     slug: "my-component",
     description: "One-line description of what it does",
     category: "effects", // buttons | cards | backgrounds | text | layout | feedback | data-display | navigation | media | effects
     status: "done",
   }
   ```

3. **Create the demo page** — add `src/routes/demo/my-component/+page.svelte` that showcases the component in context.

## Code standards

- **Svelte 5 runes only** — use `$state`, `$derived`, `$effect`, `$props`. No legacy reactive syntax.
- **TypeScript** — all props must be typed; avoid `any`.
- **Prettier** — run `pnpm exec prettier --write .` before committing. Config: `singleQuote: false`, double quotes throughout.
- **Class merging** — use the `cn()` utility (re-exported from `$lib/utils`) for conditional/merged class strings.
- **No runtime dependencies** — prefer CSS/SVG over heavy JS libraries where possible.

## Testing

```bash
pnpm test          # Vitest unit tests
pnpm test:e2e      # Playwright end-to-end tests
pnpm check         # svelte-check type checking
```

`pnpm test` and `pnpm test:e2e` must pass. `pnpm check` must pass for any files you touched — pre-existing errors in unrelated files are acceptable.

## PR process

1. Branch from `main` with a descriptive name (e.g. `feat/star-rating-component`).
2. Keep commits focused — one logical change per commit with a clear message.
3. **Add a changeset** (see below) — CI will block merging without one.
4. Include a link to the live demo page in the PR description.
5. Fill out the pull request template checklist.

Once your PR is merged, the changeset bot opens (or updates) a **"Version Packages"** PR
that bumps `package.json` and updates `CHANGELOG.md`. When that PR is merged, a git tag
and GitHub Release are created automatically.

## Changesets

This project uses [changesets](https://github.com/changesets/changesets) to manage
versioning and changelogs. Every PR that changes user-facing behaviour **must** include
a changeset file.

```bash
pnpm changeset
```

You'll be prompted to pick a bump type (`patch` / `minor` / `major`) and write a
short summary. Commit the generated `.changeset/*.md` file alongside your code.

### What to write

Be specific about **which component** changed and **what the user impact is**:

```
feat(AnimatedBeam): add optional `thickness` prop (default: 2)
fix(NumberTicker): prevent double-counting on rapid re-mount
feat: add SpinnerButton component
```

### Bump type guide

| Change | Bump |
|---|---|
| Bug fix, CSS correction, accessibility improvement, perf, docs | `patch` |
| New component, new optional prop (with default), new export | `minor` |
| Renamed/removed component or prop, changed prop type, raised Svelte/Tailwind/Node minimum | `minor` (0.x) → `major` (≥1.0) |

**Breaking changes in a copy-paste library** — because users own the code they copy,
a breaking change only affects new users and those who manually update. A change is
breaking if it would require editing a copied file to stay compatible. Always describe
these explicitly in your changeset.

## Versioning

fancy-ui follows **Semantic Versioning 2.0.0**. The project is in the `0.x` phase:
minor releases may include breaking changes (SemVer §4). Version `1.0.0` will be
tagged once all component props are stable, `src/lib/index.ts` exports are frozen,
and a complete CHANGELOG exists.

Questions? Open an [issue](https://github.com/RamaHerbin/fancy-ui/issues) or start a discussion.
