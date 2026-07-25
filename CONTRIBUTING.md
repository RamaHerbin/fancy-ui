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

## Docs translations (i18n)

The docs site is localized through a single mechanism: **message catalogs** in `src/lib/i18n/messages/`. `en.ts` is the source of truth; every other `<code>.ts` file translates the exact same keys and is looked up at runtime by `t()` (from `$lib/stores`), which falls back to English per key.

**Adding a UI string:** add the key to `en.ts` first, then add its translation to all other catalogs. Two gates keep the catalogs honest:

- `satisfies Catalog` on every translated catalog makes a missing, extra, or typo'd key a compile error (`pnpm check`).
- `pnpm check:i18n` verifies locale registry ↔ catalog files ↔ key parity ↔ the RTL map in `src/app.html`, and runs in CI.

**Adding a locale:** add an entry to `src/lib/i18n/locales.ts`, drop a full `src/lib/i18n/messages/<code>.ts` catalog (`export default { … } satisfies Catalog;`), and if the language is RTL, mirror it in the pre-paint `RTL` map in `src/app.html`.

**What stays English:** component names, and the registry descriptions in `src/lib/fancy-ui/registry.ts` (including `categoryLabels`/`categoryDescriptions`) — they are the machine-facing source feeding `/llms.txt` and the Component Copilot. Docs UI must not render them as display text; use the translated `category.*` keys (via `tCategory()`) instead.

## Storybook

Storybook documents and develops components in isolation, with live prop controls and autodocs.

```bash
pnpm storybook        # dev server on http://localhost:6006
pnpm build-storybook  # static build in storybook-static/ (gitignored)
```

### Where stories live

- All stories go in **`src/stories/`** — never in `src/lib/`, because everything under `src/lib` is published to npm by `svelte-package`.
- One file per component: `src/stories/<component-slug>.stories.svelte`, where the slug matches the component folder in `src/lib/fancy-ui/<slug>/`.
- Docs pages use MDX: `src/stories/*.mdx` (see `Introduction.mdx`).

### Naming conventions

- File: `shimmer-button.stories.svelte` (kebab-case slug).
- Meta title: `"<Category>/<ComponentName>"` — e.g. `"Buttons/ShimmerButton"`. Categories mirror the registry categories (`Buttons`, `Cards`, `Text`, `Effects`, …).
- Story names: `"Default"` first, then descriptive variants (`"Custom Shimmer"`, `"Thick Border"`).

### Writing a story

Svelte CSF via `@storybook/addon-svelte-csf` (Svelte 5, `defineMeta`):

```svelte
<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";

	const { Story } = defineMeta({
		title: "Buttons/ShimmerButton",
		component: ShimmerButton,
		tags: ["autodocs"],
		args: { shimmerColor: "#ffffff" },
	});
</script>

{#snippet template(args: any)}
	<ShimmerButton {...args}>Click me</ShimmerButton>
{/snippet}

<Story name="Default" {template} />
```

Rules: use **real props only** (check the component's exported `Props` type); default state first, then 2–3 useful variants; `tags: ["autodocs"]` generates the docs page from props + JSDoc comments.

### Configuration

- `.storybook/main.ts` — stories glob (`src/stories/`), addons (`svelte-csf`, `a11y`, `docs`), framework `@storybook/sveltekit`.
- `.storybook/preview.ts` — imports the app's global stylesheet (`src/routes/layout.css`: Tailwind v4 + design tokens), and provides a light/dark toolbar toggle (toggles the `.dark` class).
- Tailwind and the `$lib` alias work out of the box: `@storybook/sveltekit` reuses the project's `vite.config.ts`.

## PR process

1. Branch from `develop` with a descriptive name (e.g. `feat/star-rating-component`).
2. Keep commits focused — one logical change per commit with a clear message.
3. **Add a changeset** (see below) — CI will block merging without one.
4. Include a link to the live demo page in the PR description.
5. Fill out the pull request template checklist.

Once your PR is merged into `develop`, see the [Release process](#release-process) section for what happens next.

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

| Change                                                                                    | Bump                           |
| ----------------------------------------------------------------------------------------- | ------------------------------ |
| Bug fix, CSS correction, accessibility improvement, perf, docs                            | `patch`                        |
| New component, new optional prop (with default), new export                               | `minor`                        |
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

## Release process

fancy-ui uses a two-branch model:

| Branch    | Role                                                             |
| --------- | ---------------------------------------------------------------- |
| `develop` | Integration branch — all feature/fix PRs target here             |
| `main`    | Release branch — only merged from `develop`, triggers publishing |

### Full cycle

1. **Feature branch → `develop`**
   Open a PR targeting `develop`. CI runs type-check, tests, and verifies a changeset file is present. All checks must pass before merging.

2. **`develop` → `main`**
   Open a PR targeting `main`. CI runs type-check and tests (no changeset required — changesets were already added per-feature). Merge when green.

3. **Release workflow (automatic)**
   Every push to `main` triggers the Release workflow. It builds the package (`pnpm package`) then hands off to the Changesets action, which does one of two things:
   - **If pending changesets exist → creates or updates the "Version Packages" PR.**
     This PR bumps `package.json` versions and updates `CHANGELOG.md`. Do not merge it yet — keep accumulating features until you're ready to cut a release.
   - **If the "Version Packages" PR was just merged → publishes to npm and creates a git tag.**
     This is when `fancy-ui-svelte@x.y.z` actually lands on the npm registry.

4. **Cutting a release**
   Merge the "Version Packages" PR on GitHub. The Release workflow runs again, detects no pending changesets, and publishes directly to npm.

### CI pipelines at a glance

| Trigger        | Pipeline | Blocking? | What it checks                                  |
| -------------- | -------- | --------- | ----------------------------------------------- |
| PR → `develop` | CI       | ✅ Yes    | type-check, tests, changeset present            |
| PR → `main`    | CI       | ✅ Yes    | type-check, tests                               |
| Push to `main` | Release  | —         | builds + publish or opens "Version Packages" PR |

### Secrets required

- `NPM_TOKEN` — npm publish token (set in repo settings)
- `GITHUB_TOKEN` — provided automatically by GitHub Actions

Questions? Open an [issue](https://github.com/RamaHerbin/fancy-ui/issues) or start a discussion.
