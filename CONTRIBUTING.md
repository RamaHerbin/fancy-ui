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

All three must pass before a PR can be merged.

## PR process

1. Branch from `main` with a descriptive name (e.g. `feat/star-rating-component`).
2. Keep commits focused — one logical change per commit with a clear message.
3. Include a link to the live demo page in the PR description.
4. Fill out the pull request template checklist.

Questions? Open an [issue](https://github.com/RamaHerbin/fancy-ui/issues) or start a discussion.
