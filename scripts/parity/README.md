# Visual parity bench

Photographs each component's base demo on three stages (Svelte, React, Vue) at fixed moments, then diffs React and Vue against Svelte pixel by pixel.

| Stage  | URL                                                      | Source                                           |
| ------ | -------------------------------------------------------- | ------------------------------------------------ |
| Svelte | `http://localhost:5291/_parity/<slug>?theme=light\|dark` | `src/routes/_parity/[slug]` (docs base demo)     |
| React  | `http://localhost:5292/?slug=<slug>&theme=light\|dark`   | `examples/parity-react/src/scenarios/<slug>.tsx` |
| Vue    | `http://localhost:5293/?slug=<slug>&theme=light\|dark`   | `examples/parity-vue/src/scenarios/<slug>.vue`   |

Every stage renders the demo alone in the same 800×500 `[data-parity-stage]` box, with the same tokens, page background and font stack. The React and Vue apps alias `fancy-ui-react` / `fancy-ui-vue` to `react/src` / `vue/src`, so they test the sources, not a build. A slug with no scenario file renders `[data-parity-missing]` and is logged as `missing`.

## Start the stages

Three terminals, from the repo root:

```sh
pnpm dev --port 5291 --strictPort        # Svelte docs site
pnpm --filter parity-react dev           # 5292, strictPort
pnpm --filter parity-vue dev             # 5293, strictPort
```

A stage that is not reachable is skipped with one message.

## Run

```sh
pnpm parity:capture --only rainbow-button,meteors      # or --all (every registry slug)
pnpm parity:diff
```

Capture options: `--fw svelte,react,vue`, `--theme light,dark`, `--moments 0,600,1500` (ms of frozen-clock time after the stage is ready), `--base-svelte|--base-react|--base-vue <url>`, `--out .parity`, `--concurrency 4`, `--reduced-motion no-preference|reduce`.

Diff options: `--out .parity`, `--only a,b`, `--threshold 24` (a pixel differs when its largest channel delta exceeds this), `--no-triptych`.

Determinism checks:

```sh
pnpm parity:diff --compare-runs <runA> <runB>   # two captures of the same stages; should be 0
pnpm parity:diff --self-check                   # the metric itself: 0 vs itself, > 0 vs a 1 px shift
```

Determinism comes from a frozen Playwright clock (Date, `performance.now`, timers, rAF), seeded `Math.random` / `crypto.getRandomValues`, and a sync loop that pins every CSS / Web Animation to the fake clock. The header of `capture.mjs` has the details.

## Outputs (git-ignored, under `--out`)

- `shots/<fw>/<slug>/<theme>-<t>[-hover].png`: raw stage shots. `-hover` is the pointer pass, for slugs with a pointer hint.
- `capture-log.json`: per item `ok | missing | skipped | error`, plus page console errors.
- `scores.json`: `slug → theme → "<t>[-hover]" → { react, vue }`, each a ratio of differing pixels (0 to 1), or `null` when that framework has no shot.
- `triptych/<slug>-<theme>-<t>[-hover].png`: Svelte | React | Vue | heatmap, labelled with each ratio.

The diff prints the scores worst first. Open the triptychs of the top rows to see what differs.

Runs given `--only` merge into the existing log and scores rather than replacing them.

## Adding a port scenario

Create `examples/parity-react/src/scenarios/<slug>.tsx` (default export, no props) or `examples/parity-vue/src/scenarios/<slug>.vue`, reproducing the Svelte docs base demo. They are picked up with `import.meta.glob`; there is no index to update.

## Hints

`scripts/parity/hints/<slug>.json`, optional:

```json
{ "hover": [0.4, 0.4], "sweep": true, "click": [0.5, 0.5], "skip": "reason", "moments": [0, 300] }
```

- `hover` / `sweep` / `click`: fractions of the stage box, with the same gesture semantics as `scripts/lib/stage-capture.mjs`. They add a pointer pass (`-hover` shots), whose moments count from the end of the gesture.
- `skip`: leave the slug out, with the reason in the log, for example when it is inherently non-deterministic.
- `moments`: override `--moments` for this slug.

## Interaction states

A hint can also declare `states`: the component photographed open, with keyboard focus on its primary control, or holding content too long for it (`open`, `focus`, `long`), or in a named outcome (`idle`, `copied`, `failed`, `action`). Dialog, Select, Input, Tabs and Tooltip have the first three, the copy button has `idle`, `copied` and `failed`, and the toast has `action` and `long`, each checked to lie inside the stage box.

```json
"states": {
	"open":  { "steps": [{ "click": { "role": "combobox", "name": "Framework" } }],
	           "expect": [{ "role": "listbox", "in": "page", "inStage": true }] },
	"focus": { "steps": [{ "focus": { "role": "combobox", "name": "Framework" } }],
	           "expect": [{ "role": "combobox", "name": "Framework", "focusVisible": true }] },
	"long":  { "variant": "long", "steps": [], "expect": [{ "role": "textbox", "overflow": true }] }
}
```

- Steps (`click`, `hover`, `focus`, `press`, `type`, `wait`, `clipboard`) find their target by accessible role and exact name, or by `css`, inside the stage box (`"in": "page"` for a panel portalled out of it). Every wait runs on the frozen clock.
- After the steps the state settles: the clock moves until no finite animation is left running, so `moments` (default `[0]`) count from a still frame on every stage.
- `expect` is checked before every shot: `visible` (default), `focusVisible`, `overflow`, `inStage`.
- `variant: "<variant>"` (`action`, `long`, ...) renders `<slug>--<variant>` instead of the base demo: `examples/parity-react/src/scenarios/<slug>--<variant>.tsx`, `examples/parity-vue/src/scenarios/<slug>--<variant>.vue` and `src/routes/_parity/[slug]/variants/<slug>--<variant>.svelte` (`?variant=<variant>` on every stage).

Shots are `shots/<fw>/<slug>/<theme>-<t>@<state>.png`. `--states all|none|<names>` picks them (default `all`; names are `open`, `focus`, `long`, `idle`, `copied`, `failed`, `action`).

A state never passes by default. A missing scenario, a stage that is down, a target that does not resolve to one element, an expectation that does not hold or a shot that was not written is an error naming `<slug>@<state>`, and the capture exits non-zero. The diff exits non-zero too when one framework has a state shot another lacks.

The state helpers have unit tests: `node --test scripts/parity/states.test.mjs`.
