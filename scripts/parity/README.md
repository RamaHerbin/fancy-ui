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
