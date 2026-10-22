# fancy-ui-sv

An add-on for the Svelte CLI (`sv`) that sets up [fancy-ui-svelte](https://fancy-ui.rama.app) in an existing Svelte 5 project: SvelteKit or Svelte + Vite.

## Usage (after publication)

The package is not on npm yet. Once it is:

```bash
npx sv add fancy-ui-sv
```

Without prompts, for scripts and CI:

```bash
npx sv add fancy-ui-sv="demo:yes" --no-git-check --install npm
```

Like every community add-on, sv first warns that the Svelte maintainers have not reviewed it; `--no-download-check` skips that prompt.

### Options

| Option | Values      | Default | What it does                                                                                                                                                                                                                                                               |
| ------ | ----------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo` | `yes`, `no` | `yes`   | SvelteKit: adds the route `/demo/fancy-ui` and a link to it in the floating demo menu that `sv` add-ons share (rendered from the root layout). Svelte + Vite: writes `src/lib/fancy-ui-demo/FancyDemo.svelte` and tells you how to render it; `App.svelte` is not touched. |

## What it changes

1. **package.json**: adds `fancy-ui-svelte` to `dependencies`, at `^` the version this add-on was released with. If the project already declares `fancy-ui-svelte` (any version, a `file:` or `workspace:` spec), it is left exactly as it is.
2. **One CSS line**: `@import "fancy-ui-svelte/tailwind.css";`, inserted right after the last `@import` of the CSS file that imports Tailwind (`src/routes/layout.css` in SvelteKit, `src/app.css` with Vite, or whichever `src/**/*.css` file imports `tailwindcss`). Quotes follow your Tailwind import. Nothing else in the file moves: comments, blank lines, `@plugin` and your own `@custom-variant dark` stay where they are, after the new line.
3. **Demo** (option `demo`): see the table above. The demo uses only server-rendered components (`RainbowButton`, `Button`, `BorderBeam`, `LineShadowText`), no WebGL.

The package's README covers what `tailwind.css` brings: the `@source` lines so Tailwind scans the components, the colour tokens and the `dark` variant.

## Tailwind

fancy-ui-svelte needs Tailwind CSS v4.

- **Tailwind v4 already set up** (a CSS file imports `tailwindcss`): only the line above is added.
- **No Tailwind**, or Tailwind declared but imported by no CSS file: the add-on depends on sv's official `tailwindcss` add-on, which sv runs first: it adds `tailwindcss` and `@tailwindcss/vite`, the Vite plugin, the stylesheet and its import in the root layout (or `App.svelte`), plus its editor settings in `.vscode/`. It asks which Tailwind plugins you want; answer up front with `tailwindcss="plugins:none"` for a prompt-free run.
- **Tailwind v3**: the add-on stops with a message. Upgrade to v4 first.

Do not pass `tailwindcss` yourself when Tailwind is already set up: the official add-on would then run on your stylesheet too, and it adds its own `@import 'tailwindcss'` whenever the existing one is written differently (double quotes, for instance).

## Running it again

Safe. Every change is checked first: the dependency is skipped when declared, the CSS line when any CSS file already imports `fancy-ui-svelte/tailwind.css` (with any quotes), the demo page when it exists, and the demo menu entries are not duplicated. A second `sv add fancy-ui-sv` on a committed project leaves `git status` clean, including when sv formats the files with the project's prettier.

## Removing it

Remove `fancy-ui-svelte` from `package.json`, the `@import "fancy-ui-svelte/tailwind.css";` line, and the demo (`src/routes/demo/fancy-ui/`, its entry in `src/routes/demo/DemoLinks.svelte`, or `src/lib/fancy-ui-demo/`).

## Testing a local build

sv accepts a local add-on as `file:<folder>`. The folder must hold `package.json` and `dist/` (a tarball does not work: unpack it first), and the add-on imports `sv` at run time, so `sv` must resolve from that folder.

From a checkout of this repository, where `sv-addon/node_modules/sv` exists after `pnpm install`:

```bash
pnpm --filter fancy-ui-sv run build
cd /path/to/your-app
npx sv@1.1.1 add file:/path/to/fancy-ui/sv-addon --no-git-check
```

sv links the folder into its own `node_modules` (`sv/node_modules/fancy-ui-sv`). If you later point it at another folder with the same sv install, delete that stale link first, or sv fails with `EEXIST`.

The repository tests it three ways:

- `pnpm --filter fancy-ui-sv test`: the CSS and dependency rules, and the add-on run through sv's own engine on projects created from sv's templates (SvelteKit and Vite, TypeScript and JavaScript), twice, to check the second run changes no byte. Offline.
- `pnpm --filter fancy-ui-sv run test:sdk`: sv's official test matrix (`sv/testing`), which also installs the four projects. Needs the npm registry.
- `pnpm consumers sv-addon`: the real CLI on fresh SvelteKit apps outside the repo, with the packed add-on and the packed local `fancy-ui-svelte`, then type-check, production build and a browser test of the demo route. See `examples/consumers/README.md`.

## License

MIT
