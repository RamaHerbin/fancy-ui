# Design and motion audit instruments

The protocol for scoring a component against the design and motion contract
(`src/lib/fancy-ui/_internals/CONTRACTS.md`, sections 3 to 6): which instrument
produces which evidence, how evidence becomes a score, and what a record looks
like. This folder holds instruments and rules only. Evidence, scores and findings
live in an output folder that git never tracks (`--out`, default
`<repo>/.audit-out/audit`).

Precedents: `scripts/parity/` (frame capture and diff), `scripts/perf/` (the perf
harness). The audit instruments read their output.

## Instruments

Every script takes `--repo` (default: the checkout it lives in), `--out`,
`--inventory`, `--only slug,slug`, and, for the ones that open a stage,
`--base-svelte`, `--base-react`, `--base-vue` (defaults `http://localhost:5291`,
`:5292`, `:5293`). Every script has a JSDoc header that says what it does and what
it does not catch, and exports its pure functions. Every instrument runs its own cases with
`--self-test`; `lib.mjs` is covered by `audit.test.mjs` only. `node --test scripts/audit/audit.test.mjs` covers the pure parts
without a browser or a dev server.

| script | partial | axis | what it does |
|---|---|---|---|
| `inventory.mjs` | | | slug, name, category, group, credits and tags from `registry.ts` into `<out>/inventory.json`. Every other script reads it. |
| `static.mjs` | `S1` | A1, A2 (static half) | Literal census against `tokens.ts` (curves, durations, inline `style=` motion), reduced-motion gating, blanket override rule R9, teardown and offscreen heuristics, `motion_class` and `render` fields. Writes `evidence/static.txt`. |
| `sheet.mjs` | `S2` | capture triage | Contact sheets (rows svelte / react / vue, columns the seven moments), capture-log and parity slices, ambient-loop invariant, `capturable`. |
| `rm-check.mjs` | `S3` | A2 (dynamic half) | Settle-aware reduced-motion comparison of two capture sets. Writes `sheet-rm-<theme>.png` and `rm-ratios.json`. |
| `micro-capture.mjs` | `S4` | A3 (dynamic) | Rest, hover, press and keyboard-focus shots of the first interactive element, with a noise floor. |
| `perf-sweep.mjs` | `S5` | A4 | CDP task time, rAF rate, long tasks, p95 frame, heap, and a reload lifecycle probe; records `loadAvgAtStart`. |
| `axe-sweep.mjs` | `S6` | A8 | axe-core in both themes, settled, rest and open states, keyboard check for overlays, demo-chrome tagging. This is the local both-themes sweep; CI does not run it. |
| `merge-records.mjs` | | | Partials into one `record.json` per slug (rules below). |
| `build-matrix.mjs` | | | Records into `COMPONENT_IMPROVEMENT_MATRIX.md`, `findings-all.json`, `findings-p0p1.json`, after asserting the cross-record rules. |

`scripts/check-motion-tokens.mjs` (`pnpm check:motion-tokens`) is the CI gate that
shares the A1 vocabulary: a `var(--ft-*)` fallback that differs from `tokens.ts` is
a failure, so is a `--ft-duration-*`, `--ft-ease-*` or `--ft-stagger-*` name that
`tokens.ts` does not declare (a misspelling), and the counts of bare token-valued and uncommented off-token literals
may not rise above `scripts/motion-tokens-pins.json`.

### Thresholds

| name | value | used for |
|---|---|---|
| pixel threshold | 24 | largest channel delta above which a pixel counts as changed (same as `scripts/parity/diff.mjs`) |
| still ratio | 0.004 | two frames under this share of changed pixels are identical |
| end ratio | 0.01 | reduced-motion end state versus the settled no-preference state |
| region ratio | 0.01 | per 50x50 tile, ambient-loop check (a whole-stage ratio hides small loops) |

## Rubric: eight axes, each 0 to 3

3 = fully meets, 2 = minor deviation, 1 = contract-relevant gap, 0 = contract
broken or unusable. N/A is recorded with a reason and excluded from the mean.
Record score = mean of the applicable axes x 8 (0 to 24).

| axis | contract | evidence | 3 means |
|---|---|---|---|
| A1 motion tokens | `tokens.ts` | every `cubic-bezier()` and duration literal classified on-token, justified, ambient loop, or off-token. Bands: 0 off-token = 3, 1 to 2 = 2, 3 to 5 = 1, 6 or more = 0 | no off-token literal, or each one carries a comment that says why |
| A2 reduced motion | section 5 | static: every transform, opacity and filter transition or keyframe is inside `@media (prefers-reduced-motion: no-preference)`, or a blanket `reduce` override neutralises it (R9); JS motion reads the reduced-motion helpers. Dynamic: under `reduce` frames do not move, and the end state equals the settled no-preference state | both halves hold; colour-only transitions may stay ungated |
| A3 hover and pointer-only state | section 4 | static: motion properties under `:hover` need `(hover: hover)` and a `:focus-visible` twin; pointer handlers need a `pointerType` check or a keyboard path. Dynamic: the focus shot differs from rest | no hover-only content or motion |
| A4 perf footprint | | only for components with rAF, canvas, GPU or interval loops: idle rAF per second, CPU ms per second, long tasks, retained listeners after reloads; loops pause offscreen or hidden | idle cost within the perf README ceilings, 0 long tasks, 0 retained listeners |
| A5 framework parity | `react/PORTING.md`, `vue/PORTING.md` | parity ratio per moment in both themes for react and vue, `pnpm check:props` for the slug | every ratio under 0.01, no prop gap |
| A6 polish | | contact sheet, console errors, preview-health classes; closed defect list: `clip`, `fouc`, `width-shift`, `step`, `blur-text`, `z-fight`, `console-error`, `dark-contrast` | no defect from the list (each carries a PNG path) |
| A7 originality | | contact sheet plus source, three yes/no questions: stock default look? motion expresses meaning? signature move unique in the registry? | three yes |
| A8 a11y baseline | section 3 | axe serious and critical hits owned by the component (demo chrome excluded), static section 3 and 4 checks, visible focus ring in the focus shot | 0 serious or critical, checks hold |

Subjectivity: A6 and A7 are the only axes a rater sets. A6 is bounded by the closed
defect list; a defect outside it goes in `notes` and does not score. A7 takes two
independent raters per component; a difference of more than 1 keeps the lower score
and raises `A7-disagreement`.

### Priority (mechanical)

- 0 on A2, A3 or A8: P0.
- 1 or less on A1, A4 or A5, or 0 on A6: P1.
- anything else: P2. `none` only when there are no findings and every applicable
  axis scores 2 or more. A7 never raises priority above P2.

### Priority rules R1 and R2

- **R1, no invisible priority drivers.** Every axis that drives a priority must have
  at least one live (not wontfix, not duplicate) P0 or P1 finding on it. When no
  instrument or rater emitted one, the merge mints a synthetic finding
  `<slug>-<axis>-axis` (P0 for a 0 on A2, A3 or A8, P1 otherwise) with the axis note
  as detail, the axis evidence, a runnable verification command and no adversarial
  verdict. Ids are stable across re-merges and verdicts carry over.
- **R2, priority coherence.** Record priority is the more severe of the axis-derived
  priority and the highest live non-duplicate finding. An axe serious or critical hit
  owned by the component is a P1 finding even though A8 = 1 alone leaves the axis at P2.
- `wontfix` means refuted by adversarial review or ruled a capture-rig artefact.
  `duplicate-of:<id>` findings are excluded from live counts.

### When a dimension cannot be captured

A record never guesses. Record the limit and score only the halves that can be read:

- **Pointer-driven** components are empty or static at rest: `capturable: "pointer-pass"`, use a parity pointer hint (`scripts/parity/hints/`), and score A2 dynamic from that pass.
- **GPU layers under software rendering** draw nothing or an SDR fallback: `capturable: "rest-only"`, `na_reason: "no-gpu-headless"` on the dynamic half of A2; the static half still scores. Perf covers the main thread only.
- **Scroll-driven** components never scroll on the stage: `capturable: "rest-only"`, dynamic axes `scroll-driven`, static halves score. A parity `scroll` step is the way to capture them.
- **Ripple-like** effects that never pass the blank-frame threshold are handled as rest-only; a click hint with an early moment can rescue them.
- **Sound** is not visual: only the static section 4 rule (a pointer-type check on a hover cue) is checked; record `sound: true`.
- **Inherited reduced motion**: a folder that imports the shared anchored or transition helpers inherits their gate. A2 static scores 0 only when the folder itself declares transform, opacity or filter motion outside a gate.
- **Hover gate false positives**: colour-only `:hover` is allowed ungated. Parse the property names, not just the selector.
- **Frozen clock versus compositor**: a port that uses a JS timer the original does not matches at settle but differs at intermediate moments. Drift at intermediate moments is P2 timing drift; drift at settle is P1.
- **Machine load**: a perf reading taken on a loaded machine is indicative only and cannot produce a 0 on A4, only 2 or lower. `perf.json` records `loadAvgAtStart`.
- **Ambient loops**: a loop must show at least two later frames that differ from frame 0 in some region (the region ratio above); if not, it is dead, pinned by the capture, or longer than the window. Resolve with a real-clock capture before scoring.

## Record schema

`<out>/components/<slug>/record.json`, one per slug, validated by
`schema/record.schema.json` (`additionalProperties: false`; `lib.mjs`
`validateRecord` is the dependency-free mirror and also checks the cross-field rules).

```jsonc
{
  "slug": "example", "schema": 1,
  "kind": "core" | "fancy", "category": "<group>/<registry category>",
  "motion_class": "static" | "enter" | "micro" | "ambient" | "pointer" | "scroll" | "mixed",
  "render": ["dom" | "svg" | "canvas2d" | "webgl" | "webgpu" | "audio"],
  "sound": true | false,
  "capturable": "full" | "rest-only" | "pointer-pass" | "state-pass" | "none",
  "na_reason": null | "static" | "no-gpu-headless" | "scroll-driven" | "hdr-only" | "audio-only",
  "axes": { "A1": { "score": 0, "evidence": ["evidence/..."], "note": "" }, "...": {} },
  "raters": { "A6": ["r-a", "r-b"], "A6_raw": [2, 3], "A7": [], "A7_raw": [] },
  "findings": [{
    "id": "example-01", "axis": "A3", "priority": "P0" | "P1" | "P2" | "P3",
    "title": "", "detail": "", "evidence": ["evidence/hover-light.png", "src/...:L12"],
    "verification": "capture" | "grep" | "perf" | "axe" | "unit-test" | "manual",
    "verification_cmd": "node scripts/audit/static.mjs --only example",
    "expected_benefit": "", "frameworks": ["svelte", "react", "vue"],
    "status": "open" | "uncertain" | "wontfix" | "duplicate-of:<id>"
  }],
  "score_total": 0, "priority": "P0" | "P1" | "P2" | "none",
  "tool_versions": { "capture": "<git sha of scripts/parity>" },
  "filled_by": "", "reviewed_by": [], "iteration": 1, "uncertain_flags": []
}
```

Rules the validator and the matrix generator enforce:

- every axis has a score, or `null` with `na_reason` (the only exception is A6 and A7
  reading `awaiting rater`);
- a live P0 or P1 finding has at least one evidence path that exists, a verification
  kind other than `manual`, and a non-empty `verification_cmd`;
- an `uncertain` finding carries a `note` naming the evidence that would resolve it;
- `priority` equals the one recomputed from the axes and findings.

Folder layout per slug:

```
<out>/components/<slug>/
  record.json            the only file the matrix generator reads
  partial-S1.json ...    one per instrument, merged into record.json
  evidence/
    static.txt           literal census with line refs
    sheet-<theme>.png    contact sheet; sheet-hover-<theme>.png, sheet-rm-<theme>.png
    parity.json          slice of the parity scores
    capture-log.json     slice of the capture log
    rm-ratios.json       reduced-motion ratios per framework and theme
    micro-<state>-<fw>.png
    perf.json            perf-sweep result
    axe.json             axe-sweep result
```

## Capture moments

Frame times are milliseconds after the stage is ready (rest pass) or after the
gesture ends (pointer pass). A pointer hint already spends 350 ms resting after a
hover on the capture clock, so by default the 150 ms flip itself is not photographed.
A short `restMs` (for example 100) in the slug's hint photographs it; the rubric
otherwise scores the hover end state and A1 covers the flip duration statically.

| pass | moments |
|---|---|
| rest, default | 0, 150, 300, 600, 1200, 2000, 4000 |
| pointer, hover | 0, 200, 600 |
| pointer, click | 0, 80, 300, 600 |
| reduced motion | 0, 300, 1500, 3000 |
| no preference, reference for rm-check | 0, 600, 1500, 2000, 4000 (rm-check compares the t2000 frame) |
| ambient loops | 0, 500, 1000, 2000, 4000 |

## Running an audit

Stage servers first (never two builds in one checkout):

```sh
pnpm dev --port 5291 --strictPort     # svelte parity routes
pnpm --filter parity-react dev        # port 5292 is set in its package.json
pnpm --filter parity-vue dev          # port 5293 is set in its package.json
```

One component (replace `<slug>`; every step accepts `--only`):

```sh
node scripts/audit/inventory.mjs
node scripts/audit/static.mjs --only <slug>
node scripts/parity/capture.mjs --only <slug> --moments 0,150,300,600,1200,2000,4000
node scripts/parity/capture.mjs --only <slug> --reduced-motion reduce --moments 0,300,1500,3000 --out .parity-rm
node scripts/audit/sheet.mjs --only <slug>
node scripts/audit/rm-check.mjs --only <slug>
node scripts/audit/micro-capture.mjs --only <slug>
node scripts/audit/axe-sweep.mjs --only <slug>
node scripts/audit/perf-sweep.mjs --only <slug>      # only for rAF, canvas, GPU or interval components
node scripts/audit/merge-records.mjs --only <slug>
```

Full audit: the same steps without `--only`, captured in batches by registry
category so a crash loses one batch (`capture.mjs --only` merges into the existing
log), then `merge-records.mjs`, then `build-matrix.mjs`. Rater partials
(`partial-R-<name>-A.json`, `partial-R-<name>-B.json`) are written between the
capture steps and the merge.

A pass is complete when `build-matrix.mjs` exits 0: every inventory slug has a
schema-valid record, every axis has a score or a reason, and the cross-record rules
above hold.

Static evidence is reproducible: rerunning `static.mjs` writes nothing when the
source did not change.
