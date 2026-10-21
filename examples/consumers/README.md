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
