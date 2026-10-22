# Consumer apps

Seven minimal apps that install a fancy-ui package the way someone outside the repo does: from the packed tarball, with `npm install`, with nothing but the setup the package README documents. They test the published artifact, not the monorepo source, and catch what the in-repo examples cannot:

- a dependency the package imports but does not declare,
- a file missing from the `files` allow-list, or a broken `exports` entry,
- a Tailwind utility (`bg-primary`, …) that is not generated in the consumer's own CSS build,
- a component that only works with the docs site's CSS, aliases or framework.

None of them is a workspace member (`pnpm-workspace.yaml` globs `examples/*`, not `examples/consumers/*`), and the repo never installs them.

| App           | Package           | Framework                                            |
| ------------- | ----------------- | ---------------------------------------------------- |
| `sveltekit`   | `fancy-ui-svelte` | SvelteKit, server-rendered then hydrated             |
| `svelte-vite` | `fancy-ui-svelte` | Svelte 5 + Vite, no SvelteKit                        |
| `react-vite`  | `fancy-ui-react`  | React 19 + Vite, strict `tsc`, `skipLibCheck: false` |
| `next`        | `fancy-ui-react`  | Next.js App Router, server-rendered then hydrated    |
| `vue-vite`    | `fancy-ui-vue`    | Vue 3 + Vite                                         |
| `nuxt`        | `fancy-ui-vue`    | Nuxt, server-rendered then hydrated                  |
| `nuxt-module` | `fancy-ui-nuxt`   | Nuxt via the module, no imports, `nuxt typecheck`    |

## Running them

```bash
pnpm consumers                   # all seven, one after the other, then a summary table
pnpm consumers next nuxt         # only these
scripts/consumers/next.sh        # one app, directly
KEEP_CONSUMER=1 scripts/consumers/next.sh   # keep the scratch copy for debugging
```

`pnpm consumers` (`scripts/consumers/run-all.mjs`) runs every `scripts/consumers/<name>.sh` and exits non-zero if any of them fails. It builds and packs each package once per run and shares the tarball between the apps that use it. CI runs it in the **Consumers** job, after the package jobs.

Prerequisites: the repo installed (`pnpm install`), Playwright's Chromium (`pnpm exec playwright install chromium`), network access for `npm install`, and `rsync`.

## What each script does

Every `scripts/consumers/<name>.sh` sources `scripts/consumers/_lib.sh` and runs the same steps:

1. **Build and pack the package** (`pnpm package` for Svelte, `pnpm --filter fancy-ui-react|fancy-ui-vue|fancy-ui-nuxt run build` for the others; `nuxt-module` packs both `fancy-ui-vue` and `fancy-ui-nuxt`), then `pnpm pack` into an empty folder. The script checks it holds exactly one tarball, so an old tarball from an earlier run can never be picked up.
2. **Copy the app outside the repo**, into a `mktemp -d` folder under `$TMPDIR`. Inside the repo, a dependency missing from the app's own `node_modules` would silently resolve from the monorepo's `node_modules` (Node and Vite walk up parent folders), and the tarball's declared dependencies would go untested. The script refuses to run if the scratch folder ends up inside the repo. Build output, tests and the Playwright config are not copied.
3. **Install the tarball** by rewriting the copy's dependency to `file:<tarball>`, then `npm install` and check the package landed in the copy's `node_modules`. The `file:.tarball/<package>.tgz` value committed in each `package.json` is a placeholder; the repo copy is never modified.
4. **Build** with the app's own `npm run build`.
5. **Run the Playwright smoke**: the runner, the config and the specs stay in the repo (`@playwright/test` is not a dependency of any app), and the server runs from the scratch copy on a free port (`CONSUMER_APP_DIR`, `CONSUMER_PORT`, see `playwright.shared.ts`). Chromium runs with software GL so the WebGL effect can start headless.

The scratch folder is deleted on exit, pass or fail, unless `KEEP_CONSUMER=1` is set; its path is printed either way.

## What the smoke proves

Each app mounts `Button`, `Input`, `Select`, `Dialog`, `RainbowButton`, `BorderBeam` and a contained `FluidCursor`, with its CSS limited to what the package README documents:

```css
@import "tailwindcss";
@import "fancy-ui-<svelte|react|vue>/tailwind.css";
```

plus `fancy-ui-react/styles.css` (imported from the entry) or `fancy-ui-vue/styles.css` for the React and Vue apps. The shared assertions live in `smoke-helpers.ts`:

- **No errors**: no console error and no uncaught exception for the whole run, the WebGL effect included.
- **Interactive**: clicking `RainbowButton` runs the consumer's own handler, observed in the DOM. The three server-rendered apps (`sveltekit`, `next`, `nuxt`) set `data-hydrated="true"` from their mount hook and the smoke waits for it before clicking, so a click cannot land on server markup that is not interactive yet.
- **Tailwind output**: a `Button`'s computed background equals what `var(--primary)` resolves to, and neither is transparent, so `bg-primary` and the tokens exist in the consumer's build.
- **BorderBeam**: the `.border-beam` root renders its `.bb-head` element, the component's stylesheet applies to it (`position: absolute`), it runs a CSS animation with a non-zero duration, and the root carries `--border-beam-duration`. Counting child elements alone would pass with the stylesheet missing.
- **GPU effect**: `FluidCursor`'s canvas refuses a `2d` context, which happens only when WebGL or WebGPU already owns it. The canvas element is always rendered, so its presence alone proves nothing.
- **Dialog**: opens from a focused trigger with Enter and closes with Escape.

`react-vite` also type-checks the app with strict `tsc` and `skipLibCheck: false`, so every declaration file the package publishes is compiled.

`nuxt-module` is the `nuxt` app with the module instead of imports: `modules: ["fancy-ui-nuxt"]`, `<FancyButton>`, `<FancyDialog>`… with no `import`, and only the two Tailwind lines in its CSS (the module adds `fancy-ui-vue/styles.css`). It runs `nuxt typecheck` (vue-tsc) before building, checks the packed `fancy-ui-nuxt` manifest carries no `workspace:` range, and the smoke adds that every `Fancy*` tag rendered as a component on the server.

### Negative control

The `bg-primary` assertion has been checked against a broken setup, once, by hand (not committed, since it is meant to fail):

```bash
KEEP_CONSUMER=1 scripts/consumers/next.sh       # passes, prints the scratch path
cd <scratch>/app
# remove `@import "fancy-ui-react/tailwind.css";` from app/globals.css
npm run build                                    # the build still succeeds
cd <repo>
CONSUMER_APP_DIR=<scratch>/app CONSUMER_PORT=4391 \
  pnpm exec playwright test -c examples/consumers/next/playwright.config.ts
```

The smoke then fails in `expectPrimaryBackground`: `var(--primary)` resolves to `rgba(0, 0, 0, 0)` because the token is never defined. A build that drops the package's Tailwind entry is caught even though it compiles.

## Svelte apps: what they add

`sveltekit` and `svelte-vite` run the shared assertions above plus the ones in `svelte-helpers.ts`:

- **Dark theme**: a toggle adds `.dark` to a wrapper element (no OS preference involved) and a `Button`'s background must follow the flipped `--primary`, then return when the class is removed.
- **Events**: the consumer's `onclick` on `Button` and `onOpenChange` on `Dialog` run, with the `true` then `false` the component reports when opened with Enter and closed with Escape.
- **Install snippets**: the stylesheet, first-component and usage snippets from `src/lib/docs/install-snippets.ts` live in each app (`src/app.css`, `src/snippets/`) and render in the page. The types snippet (`src/snippets/types.ts`) renders nothing, so the `sveltekit` app type-checks it with strict `svelte-check` before building: a removed `BorderBeamProps` export or a wrong prop name fails the run. `src/lib/docs/consumer-snippets.test.ts` fails when they drift from the docs.
- **Cameleon** (`svelte-vite` only): `FancyProvider` from `fancy-ui-svelte/cameleon` with a skin builds and mounts in a plain Vite app, so a build failure is a defect, not a known gap.

## Adding a consumer

1. Create `examples/consumers/<name>/` with its own `package.json` (the package dependency set to `file:.tarball/<package>.tgz`), the documented CSS setup, a `tests/smoke.spec.ts` built on `smoke-helpers.ts`, and a `playwright.config.ts` built on `playwright.shared.ts`.
2. Add `scripts/consumers/<name>.sh` following an existing one. `run-all.mjs` picks up every `.sh` in that folder whose name does not start with `_`.
