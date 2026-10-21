# Consumer apps

Minimal apps that install a packed build of a published package the way an
outsider would: from a `.tgz`, with `npm install`, outside the pnpm workspace
(they are deliberately not listed in `pnpm-workspace.yaml`), with no monorepo
alias and none of the docs site's CSS. They catch what the in-repo example
apps cannot: a missing file in `files`, a broken `exports` entry, a stylesheet
that does not ship, or utilities that the Tailwind scan never generates.

## nuxt

`scripts/consumers/nuxt.sh` builds `fancy-ui-vue`, runs `pnpm pack` into a
scratch folder, points the app's `fancy-ui-vue` dependency at that tarball
(the committed `package.json` is restored afterwards), installs with npm,
builds the Nuxt app and runs the Playwright smoke test in Chromium.

The app's CSS is exactly the three imports the package README documents:
`tailwindcss`, `fancy-ui-vue/tailwind.css` and `fancy-ui-vue/styles.css`. It
mounts `Button`, `Input`, `Select`, `Dialog`, `RainbowButton`, `BorderBeam`
and a contained `FluidCursor`.

The smoke test proves that:

- the page loads with no console or page errors (the GPU effect included);
- it hydrates: a click on `RainbowButton` runs the consumer's own handler;
- `bg-primary` exists in the generated CSS: a `Button`'s computed background
  equals the `--primary` token and is not transparent;
- `Dialog` opens and closes from the keyboard (Enter, then Escape).
