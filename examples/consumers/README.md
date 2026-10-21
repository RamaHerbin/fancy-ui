# Consumer apps

Minimal apps that install a published-shaped package the way an outsider would: from the
packed tarball, outside the pnpm workspace, with no monorepo alias and none of the docs-site
CSS. They exist to catch what the in-repo examples cannot, such as a missing file in
`files`, a broken `exports` entry or a utility class that never compiles.

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
