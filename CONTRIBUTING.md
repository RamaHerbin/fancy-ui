# Contributing to fancy-ui

Thanks for your interest in contributing! This guide covers everything you need to get started.

Questions, ideas and show-and-tell belong in [GitHub Discussions](https://github.com/RamaHerbin/fancy-ui/discussions); bugs and concrete feature requests go through the [issue forms](https://github.com/RamaHerbin/fancy-ui/issues/new/choose). The getting-started and component docs pages carry an "Edit this page" and a "Report an issue" link (the `PageActions` component, `src/lib/components/docs/PageActions.svelte`): the first opens the page source on `develop` in the GitHub editor, the second opens a bug report with the page name, the page URL and your selected framework filled in. By taking part you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md); security problems follow [SECURITY.md](./SECURITY.md), never a public issue.

## Getting started

```bash
git clone https://github.com/RamaHerbin/fancy-ui.git
cd fancy-ui
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:5173`. Component demos are at `/docs/components/<slug>`.

## Adding a component

1. **Copy the template** — duplicate `src/lib/fancy-ui/_template/` and rename it to your component slug (e.g. `src/lib/fancy-ui/my-component/`). Rename `Component.svelte` to `MyComponent.svelte`, update the folder's `index.ts`, and describe every prop in its `README.md`.

2. **Register it** — add an entry to `src/lib/fancy-ui/registry.ts`:

   ```ts
   "my-component": {
     name: "MyComponent",
     slug: "my-component",
     description: "One-line description of what it does",
     category: "effects", // one of the `ComponentCategory` values in src/lib/types.ts
     group: "fancy", // "core" = foundational primitive, "fancy" = animated showcase component
     status: "done",
     props: [/* one entry per prop: name, type, default, description */],
   }
   ```

3. **Export it** — add it to the barrel in `src/lib/fancy-ui/index.ts`. `pnpm check:registry` fails if a folder, its registry entry and its export disagree.

4. **Write the colocated test** — `src/lib/fancy-ui/my-component/MyComponent.test.ts` (Vitest + jsdom).

5. **Add docs examples** — one `.svelte` file per example in `src/lib/components/docs/examples/my-component/` (`BasicUsage.svelte` first), each listed under the slug in `src/lib/components/docs/examples/registry.ts`. They render on `/docs/components/my-component`; the old `src/routes/demo/<slug>` route is only a redirect now.

6. **Port it to React and Vue in the same PR** — `react/src/components/my-component/` and `vue/src/components/my-component/`, following [`react/PORTING.md`](./react/PORTING.md) and [`vue/PORTING.md`](./vue/PORTING.md). CI fails on a missing port, and `pnpm check:props` fails on a Svelte prop with no React or Vue counterpart (a deliberate gap is recorded, with its reason, in `scripts/prop-parity-allowlist.json`).

7. **Add a changeset** — `pnpm changeset` (see [Changesets](#changesets)).

## Code standards

- **Svelte 5 runes only** — use `$state`, `$derived`, `$effect`, `$props`. No legacy reactive syntax.
- **TypeScript** — all props must be typed; avoid `any`.
- **Prettier** — run `pnpm exec prettier --write .` before committing. Config: `singleQuote: false`, double quotes throughout.
- **Class merging** — use the `cn()` utility (re-exported from `$lib/utils`) for conditional/merged class strings.
- **No runtime dependencies** — prefer CSS/SVG over heavy JS libraries where possible.

## Testing

```bash
pnpm check           # svelte-check type checking
pnpm test            # Vitest unit tests
pnpm check:registry  # component folders = registry entries = barrel exports
pnpm check:props     # every Svelte prop has a React and a Vue counterpart
pnpm check:cores     # shared framework-free engines are byte-identical in the three packages
pnpm check:i18n      # message catalog parity — run it when you touch i18n
```

All of these run in CI and must pass. When you touch `react/` or `vue/`, also run that package's own gates (`pnpm --filter fancy-ui-react run check`, `run test`, `run build`, and the same for `fancy-ui-vue`).

### Browser suite (e2e)

`pnpm test:e2e` runs the Playwright suite in `tests/e2e/`. The `E2E` workflow (`.github/workflows/e2e.yml`) runs a stable subset on every pull request to `develop` or `main` and on pushes to both: `docs-framework`, `components-gallery`, `home`, `landing-footer`, `overlays-keyboard` and `touch-scroll`. It starts the dev server in test mode, runs Chromium with two retries, and uploads the HTML report and the traces as artifacts when it fails. Download them from the run page and open a trace with `pnpm exec playwright show-trace <trace.zip>`.

The other specs (`builder-*`, `inspiration`, `sound-lab`) are not run there yet. Run them locally with `pnpm test:e2e` when a change touches the builder, the Inspiration gallery or the sound lab. Keep specs offline: stub third-party requests with `page.route` instead of reaching the network.

## Docs translations (i18n)

The docs site is localized through a single mechanism: **message catalogs** in `src/lib/i18n/messages/`. `en.ts` is the source of truth; every other `<code>.ts` file translates the same keys. The catalog is a flat object of string messages, read at runtime with three helpers from `$lib/stores`, each falling back to English per key:

| Helper              | Use it for                      | Example                                        |
| ------------------- | ------------------------------- | ---------------------------------------------- |
| `t(key, vars?)`     | a message, with `{name}` values | `t("table.portName", { framework: "React" })`  |
| `tn(key, n, vars?)` | a count (plural message)        | `tn("gallery.results", 12)`                    |
| `tx(key, vars?)`    | a message with inline tags      | `<RichText segments={tx("intro.cta.body")} />` |

Never build a sentence from fragments and never call `.replace("{count}", …)` at a call site: word order differs between languages, and plural rules differ again. One sentence is one message.

### Adding or changing a UI string

1. Add the key to `en.ts` with a `/** @context … */` comment above it saying where the text appears and what its variables are. Translators work from that comment, not from the code.
2. Add the key to every other catalog (`pnpm check` fails on a missing, extra or typo'd key through `satisfies Catalog`). A translation you cannot write yourself goes in as the English text and is marked for review by the quality test.
3. Run `node scripts/i18n-context.mjs` to refresh `messages/context.json` (English, context, length budget and where the key renders), then `pnpm check:i18n` and `pnpm test`.
4. If you change the English of an existing key, say so in the PR: the reviewers' manifests hash the English, so the key shows up as stale for every locale until it is re-read.

Do not add a key nothing reads. The quality test fails on dead keys; a key that is registered ahead of the component that will use it is listed in `deadKeys.pendingConsumers` in `messages/quality-allowlist.json` until that component lands.

### Messages with values, counts and tags

- **Values** are `{name}` placeholders. Every translation must carry exactly the placeholders of the English text. Numbers passed to `t()` are formatted for the active locale; pass a string (a version, a name) to keep it as written.
- **Counts** are plural messages: flat keys `<base>.<category>`, read with `tn(base, n)`. `{count}` is always available. A catalog provides the CLDR cardinal categories of its language, and `.other` is always required: `en`, `de`, `es`, `it`, `pt`, `fr`, `tr`, `hi`, `fa` have `one` and `other`; `pl` and `cs` have `one`, `few`, `many`, `other`; `ar` has `zero`, `one`, `two`, `few`, `many`, `other`; `ja`, `ko`, `zh-Hans`, `id` have only `other`. `fr`, `es`, `it` and `pt` may add `many` (exact millions) but do not have to. Languages where `one` covers 0 as well (`fr`, `pt`, `hi`, `fa`) must keep `{count}` in `one`; where `one` is exactly 1 and for `zero`/`two`, the number may be said in words. `pnpm check:i18n` enforces the category set per locale.
- **Tags** in a message are a closed set: `<b>`, `<grad>`, `<solid>`, `<link>…</link>`. They render through `tx()` and `<RichText>`; there is no raw HTML anywhere. A translation keeps the same tags, properly nested, and may move them to follow the sentence. Never translate or rename a tag.

### Registers and glossary

Each locale has one register, applied consistently: `fr` vous, `de` du, `es` tú, `it` tu, `pt` você, `pl` and `cs` neutral (no direct address where avoidable), `ja` です/ます, `ko` 합니다, `zh-Hans` 你, `tr` siz, `id` Anda, `hi` आप, `ar` and `fa` formal. Terminology follows `src/lib/i18n/messages/reviewed/glossary.md`; the words in the `jobs.*` labels and the `category.*` labels must stay in the same family.

### Script and typography rules

The quality test checks these per script, so write them as native typography would:

- `fr`: a no-break space (U+00A0 or U+202F) before `:` `;` `!` `?` and inside « ».
- `pl`, `cs`: a no-break space after single-letter words (`w`, `z`, `i`, `a`, `o`, `u`, and in Czech `k`, `s`, `v`) so they never end a line.
- `ja`, `zh-Hans`: full-width punctuation next to CJK text, half-width inside Latin runs.
- `ar`, `fa`: the Arabic comma `،`, semicolon `؛` and question mark `؟`.
- Every locale: the sentence ends with the same kind of mark as the English one (full stop, colon, question or exclamation mark, ellipsis), expressed in the script's own form; no doubled punctuation, no stray double spaces.
- Short labels have a **length budget**: a key whose prefix is in the budgeted list (`nav.`, `a11y.`, `header.`, `status.`, `table.`, `footer.`, `jobs.`, `category.`, `comp.`, `tg.`, `search.`, … see `scripts/lib/i18n-budget.mjs`) and whose English is at most 40 characters may be at most `max(⌈1.6 × English⌉, English + 12)` characters long, counted in code points. `messages/context.json` lists the budget per key as `maxLen`. If a correct translation cannot fit, add a per-key override in the `length` section of `quality-allowlist.json` (`"<code>": { "<key>": <absolute maximum> }`, or `"*"` for every locale) instead of abbreviating badly, and keep the reason in the pull request. Sentences and paragraphs are not budgeted.
- A value identical to the English one fails the `untranslated` check unless the term genuinely stays (a product name, a technical word, a cognate). Those exceptions live in `quality-allowlist.json`, each with a reason.

### Review workflow

A message exists in one of two states: a machine draft, or text a native reviewer has read. They are told apart by a **review manifest**, `src/lib/i18n/messages/reviewed/<code>.json`: `{ "<key>": sha1(English) }` for every key the reviewer has read. A catalog starts with the line `// <Language> (<code>) — machine-translated draft…`; the reviewer reads the whole catalog against the current English and `messages/context.json`, removes that header line, then runs

```bash
node scripts/i18n-manifest.mjs <code>          # write the manifest
node scripts/i18n-manifest.mjs <code> --check  # verify it
```

From then on the locale is strict: the quality test fails on a missing, stale or extra manifest entry, on a leftover draft header, and on every style check (untranslated, punctuation, script hygiene, length), so changing the English of a key (or adding one) sends it back to every reviewer. A reviewer owns exactly two files, `messages/<code>.ts` and `messages/reviewed/<code>.json`, and reports English that is ambiguous instead of "fixing" it in translation. Never write a manifest by hand and never regenerate one without reading the keys it marks.

`pnpm vitest run src/lib/i18n/catalog-quality.test.ts` runs the whole gate. The structural checks (keys, plural categories, placeholders, tags, dead keys, literal English in the docs chrome, the runtime helpers) always block. The style checks block for a locale with a manifest and only warn for the others; to see them as failures while you review one locale:

```bash
I18N_STRICT=fr pnpm vitest run src/lib/i18n/catalog-quality.test.ts -t "catalog fr"
```

**Strict locales.** `cs`, `de`, `es`, `fr`, `id`, `it`, `ja`, `ko`, `pl`, `pt`, `tr` and `zh-Hans` are reviewed: their manifests are pinned in `REVIEWED_LOCALES` in `catalog-quality.test.ts`, so deleting one fails the gate even though `manifestMode` is `"warn"`. `ar`, `fa` and `hi` are still machine drafts (no manifest yet) and only warn. When their reviews land, add the code to `REVIEWED_LOCALES` in the same pull request; once all fifteen are pinned, set `"manifestMode": "fail"` in `messages/quality-allowlist.json`.

**When the English changes.** Editing the English of a key, or adding a key, makes it stale in every reviewed locale. The pull request that changes English does not rewrite the other manifests; it says so, and the gate then names the keys. To find them for one locale:

```bash
node scripts/i18n-manifest.mjs <code> --check   # lists "not reviewed" and "English changed" keys
```

A reviewer re-reads exactly those keys against the new English and `messages/context.json`, fixes the translation, then reruns `node scripts/i18n-manifest.mjs <code>`, which prints the keys it is re-marking so they can be checked once more. For a plural message, every English variant counts as one group: editing `.one` also marks `.other` (and the other categories) stale. Refresh `messages/context.json` with `node scripts/i18n-context.mjs` whenever an English message or its `@context` comment changes.

### Adding a locale

Add an entry to `src/lib/i18n/locales.ts`, drop a full `src/lib/i18n/messages/<code>.ts` catalog (`export default { … } satisfies Catalog;`), pin its plural categories in `scripts/lib/i18n-parse.mjs` (`REQUIRED_PLURALS`), and mirror the code in the pre-paint `LOCALES` map in `src/app.html` (plus `RTL` if the language is right-to-left). `pnpm check:i18n` fails until all of that agrees. The pre-paint script sets `lang` and `dir` before first paint only from a persisted choice (`?lang=` or the saved preference); a locale guessed from the browser language is applied after hydration, so a first visit never mirrors English text.

### What stays English

Translate the docs chrome, not the library's own content. These stay English on purpose and are never added to a catalog:

- registry descriptions, `categoryLabels` and `categoryDescriptions` (machine-facing, feed `/llms.txt` and the Component Copilot);
- prop, slot, event and CSS-variable names and their descriptions in the API tables;
- component example titles and descriptions;
- changelog entries and release notes;
- recipe content (titles, steps, pitfalls and code), while the recipe page headings come from the catalog;
- the page `<title>` of component and recipe pages.

What follows explains why and where the line sits.

Component names, and the registry descriptions in `src/lib/fancy-ui/registry.ts` (including `categoryLabels` and `categoryDescriptions`): they are the machine-facing source feeding `/llms.txt` and the Component Copilot. Docs UI must not render them as display text; use the translated `category.*` keys (via `tCategory()`). Component example titles and descriptions, the changelog, recipe bodies and the page `<title>` of component and recipe pages are English on purpose, so the search-result headline matches English queries. Everything else visible in the docs chrome is a message: the quality test scans `src/lib/components/docs/**` and `src/routes/docs/**` for literal English text, `aria-label`, `title` and `placeholder`, and fails on it unless the entry is listed with a reason in `quality-allowlist.json`. Any Latin word of three or more letters counts, lower case or Capitalised (`Previous`, `Copy`, `Browse Components`); only brand names, acronyms and code identifiers (`FancyUI`, `CLI`, `FluidCursor`) are exempt.

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
5. Fill out the pull request template checklist (tests, the three ports, a changeset, and no third-party product names).

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

A PR that changes nothing users can see (tests, CI, internal docs) still carries a
changeset: run `pnpm changeset --empty` to write one with no package in it. `pnpm test`
audits the pending files (known package names, a real summary for every bump) and accepts
that empty form.

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
   Every push to `main` triggers the Release workflow. It builds the three packages (`pnpm package` for Svelte, then the React and Vue builds) then hands off to the Changesets action, which does one of two things:
   - **If pending changesets exist → creates or updates the "Version Packages" PR.**
     This PR bumps `package.json` versions and updates `CHANGELOG.md`. Do not merge it yet — keep accumulating features until you're ready to cut a release.
   - **If the "Version Packages" PR was just merged → publishes to npm and creates a git tag.**
     This is when `fancy-ui-svelte`, `fancy-ui-react` and `fancy-ui-vue` actually land on the npm registry (each at its own version, only when it has pending changesets).

4. **Cutting a release**
   Merge the "Version Packages" PR on GitHub. The Release workflow runs again, detects no pending changesets, and publishes directly to npm.

### CI pipelines at a glance

| Trigger        | Pipeline | Blocking? | What it checks                                                                                                                      |
| -------------- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| PR → `develop` | CI       | ✅ Yes    | Svelte package (`check:registry`, `check:i18n`, `check:props`, `check:cores`, `check`, `test`, `build`, `package`, pack allow-list) |
|                |          |           | React package (check, test, build, matrix, publint, pack, consumer apps) + React 18 floor                                           |
|                |          |           | Vue package (check, test, build, matrix, publint, pack, consumer app) + Vue 3.5 floor                                               |
|                |          |           | changeset present                                                                                                                   |
| PR → `main`    | CI       | ✅ Yes    | same jobs, no changeset required                                                                                                    |
| Push to `main` | Release  | —         | builds the three packages + publish or opens "Version Packages" PR                                                                  |

### Secrets required

- `GITHUB_TOKEN` — provided automatically by GitHub Actions

There is no `NPM_TOKEN`. Publishing uses npm trusted publishing (OIDC): each of the three packages lists this repository's `.github/workflows/release.yml` as its trusted publisher, and the workflow's `id-token: write` permission is exchanged for a short-lived publish token, with provenance attested.

Questions? Open an [issue](https://github.com/RamaHerbin/fancy-ui/issues) or start a discussion.
