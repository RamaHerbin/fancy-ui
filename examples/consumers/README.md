# Consumer apps

Minimal apps that install a packed fancy-ui package the way an outsider would, to prove the published artifact works rather than the monorepo source. They are deliberately **not** in `pnpm-workspace.yaml`: no workspace link, no source alias, no docs-site CSS.

## vue-vite

Run it with `scripts/consumers/vue-vite.sh`. The script:

1. builds `fancy-ui-vue` and runs `pnpm pack` into `examples/consumers/vue-vite/.tarball/`,
2. points the app's `fancy-ui-vue` dependency at that tarball (`file:` path computed by the script, so CI can regenerate it),
3. reinstalls with `npm install` (outside the workspace), builds with Vite,
4. runs the Playwright smoke in `tests/smoke.spec.ts` with the runner installed at the repo root.

The CSS is exactly the three imports the package README documents: `tailwindcss`, `fancy-ui-vue/tailwind.css`, `fancy-ui-vue/styles.css`.

The app mounts `Button`, `Input`, `Select`, `Dialog`, `RainbowButton`, `BorderBeam` (light effect) and a contained `FluidCursor` (GPU effect). The smoke proves:

- the page loads with no console error and no uncaught exception,
- it is interactive: clicking `RainbowButton` runs the consumer's own `@click` handler (asserted through DOM text),
- `bg-primary` exists in the consumer's build: a `Button`'s computed background-color equals the `--primary` token and is not transparent,
- the GPU effect mounts its canvas,
- `Dialog` opens from the keyboard (Enter on the trigger) and closes with Escape.
