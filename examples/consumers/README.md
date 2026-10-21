# Consumer apps

Minimal apps that use a published-shaped build of a fancy-ui package the way an outsider does: from a packed tarball, outside the pnpm workspace, with no monorepo alias and no docs-site CSS. The build runs in a copy placed outside the repo tree, so module resolution cannot fall back to the monorepo's `node_modules`. They catch what the in-repo apps cannot: a dependency the package imports but does not declare, a missing file in the `files` list, a broken `exports` entry, a Tailwind utility that is not generated downstream.

None of them is listed in `pnpm-workspace.yaml`, and each installs with `npm install`.

## sveltekit

```bash
scripts/consumers/sveltekit.sh
```

The script builds the package (`pnpm package`), runs `pnpm pack` into a scratch folder, copies the app (without its tests) and the tarball into that scratch folder, points the app's `fancy-ui-svelte` dependency at it with a `file:` path, runs `npm install` and `npm run build` inside the copy, then runs the Playwright smoke from the repo (Chromium, the repo's `@playwright/test`, config inside the app folder, preview server started in the copy).

The app's CSS is exactly the two imports the README documents:

```css
@import "tailwindcss";
@import "fancy-ui-svelte/tailwind.css";
```

It mounts `Button`, `Input`, `Select`, `Dialog`, `RainbowButton`, `BorderBeam` and a contained `FluidCursor`. The smoke proves:

- the page loads with no console error and no uncaught exception, including the WebGL effect (headless Chromium runs on software GL);
- it hydrates: clicking `RainbowButton` runs the consumer's own `onclick`, observed in the DOM;
- a `Button` has a non-transparent background equal to the `--primary` token, so `bg-primary` is generated from the packed output;
- `Dialog` opens from a focused trigger with Enter and closes with Escape.

## vue-vite

Run it with `scripts/consumers/vue-vite.sh`. The script:

1. builds `fancy-ui-vue` and runs `pnpm pack` into `examples/consumers/vue-vite/.tarball/`,
2. points the app's `fancy-ui-vue` dependency at that tarball (`file:` path computed by the script, so CI can regenerate it),
3. copies the app (without `node_modules`, `dist`, `.tarball`) to a `mktemp -d` directory outside the repo, installs with `npm install` there and builds with Vite,
4. runs the Playwright smoke in `tests/smoke.spec.ts` with the runner installed at the repo root, serving the scratch build (`CONSUMER_APP_DIR`).

The CSS is exactly the three imports the package README documents: `tailwindcss`, `fancy-ui-vue/tailwind.css`, `fancy-ui-vue/styles.css`.

The app mounts `Button`, `Input`, `Select`, `Dialog`, `RainbowButton`, `BorderBeam` (light effect) and a contained `FluidCursor` (GPU effect). The smoke proves:

- the page loads with no console error and no uncaught exception,
- it is interactive: clicking `RainbowButton` runs the consumer's own `@click` handler (asserted through DOM text),
- `bg-primary` exists in the consumer's build: a `Button`'s computed background-color equals the `--primary` token and is not transparent,
- the GPU effect binds a GPU context: its canvas refuses a `2d` context because WebGL/WebGPU already owns it (the canvas element alone is always rendered, so it proves nothing),
- `Dialog` opens from the keyboard (Enter on the trigger) and closes with Escape.

## react-vite

Run it: `bash scripts/consumers/react-vite.sh`. The script builds
`fancy-ui-react`, runs `pnpm pack` into `.consumers/` (git-ignored), points the
app's `file:` dependency at that tarball, runs `npm install`, builds the app and
runs the Playwright smoke (the repo's `@playwright/test`, Chromium, software GL
so the GPU effect can start headless).

What it proves, from the published shape of the package only:

- The README setup is sufficient: `@import "tailwindcss"` plus
  `@import "fancy-ui-react/tailwind.css"` in CSS, and
  `import "fancy-ui-react/styles.css"` in the entry.
- The `exports` map, types and `dist` resolve in a Vite build with strict
  TypeScript and `skipLibCheck: false`.
- Button, Input, Select, Dialog, RainbowButton, BorderBeam and a contained
  FluidCursor mount with no console error or page error.
- Hydration works: a click on RainbowButton runs the consumer's own handler.
- `bg-primary` exists in the consumer's CSS: a Button's computed background
  equals the `--primary` token and is not transparent.
- Dialog opens and closes from the keyboard (Enter on the trigger, Escape).

## next

`scripts/consumers/next.sh` builds `fancy-ui-react`, runs `pnpm pack`, copies the tarball to
`examples/consumers/next/.tarball/`, installs with `npm install`, builds the Next app and runs a
Playwright smoke test (Chromium).

```bash
scripts/consumers/next.sh              # full run
scripts/consumers/next.sh --skip-build # reuse an existing react/dist
```

The app's CSS holds exactly the imports the package README documents (`tailwindcss` and
`fancy-ui-react/tailwind.css`), and the layout imports `fancy-ui-react/styles.css`. It mounts
`Button`, `Input`, `Select`, `Dialog`, `RainbowButton`, `BorderBeam` and a contained `FluidCursor`.

What the smoke proves:

- the page loads with no console error and no uncaught exception;
- hydration works: a click on `RainbowButton` runs the consumer's handler (read back from the DOM);
- `bg-primary` exists: a `Button` paints the same colour as the `--primary` token, not transparent;
- `Dialog` opens with Enter on its trigger and closes with Escape;
- the light effect (`BorderBeam`) and the GPU effect (`FluidCursor`, which renders a canvas) mount.

The consumer is deliberately absent from `pnpm-workspace.yaml`.
