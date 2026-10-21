# Consumer apps

Minimal apps that use a published-shaped build of a fancy-ui package the way an outsider does: from a packed tarball, outside the pnpm workspace, with no monorepo alias and no docs-site CSS. They catch what the in-repo apps cannot: a missing file in the `files` list, a broken `exports` entry, a Tailwind utility that is not generated downstream.

None of them is listed in `pnpm-workspace.yaml`, and each installs with `npm install`.

## sveltekit

```bash
scripts/consumers/sveltekit.sh
```

The script builds the package (`pnpm package`), runs `pnpm pack` into a scratch folder, copies the tarball to `examples/consumers/sveltekit/.tarball/`, points the app's `fancy-ui-svelte` dependency at it with a `file:` path, runs `npm install` and `npm run build` inside the app, then runs the Playwright smoke (Chromium, using the repo's `@playwright/test`, config inside the app).

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
