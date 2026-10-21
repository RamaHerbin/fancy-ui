# Consumer apps

Minimal apps that install a packed fancy-ui package the way an outsider would:
from a `.tgz`, with `npm install`, outside the pnpm workspace (they are not in
`pnpm-workspace.yaml`, which only globs `examples/*`). No monorepo alias, no
docs-site CSS.

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
