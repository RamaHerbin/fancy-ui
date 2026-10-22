# Performance protocol

`scripts/perf/measure.mjs` measures four things the same way every time, so two runs on the same machine can be compared and a regression has a number. It is a measurement tool, not a gate: nothing in CI reads it. The committed result of the first run is `BASELINE-2026-10-21.md`.

```bash
node scripts/perf/measure.mjs all                      # everything, then the report
node scripts/perf/measure.mjs sizes                    # one section
node scripts/perf/measure.mjs effects --only react --reps 5
node scripts/perf/measure.mjs lifecycle --wait-quiet off   # measure now, whatever the load
PERF_OUT=~/perf-run-2 node scripts/perf/measure.mjs all
```

| Section     | What it answers                                                             |
| ----------- | --------------------------------------------------------------------------- |
| `sizes`     | How many KB of JS and CSS does each consumer app ship?                      |
| `imports`   | What does one component cost through the barrel, versus its own folder?     |
| `effects`   | What does an effect cost per second while idle and while the pointer moves? |
| `lifecycle` | Does mounting and unmounting leak contexts, listeners or memory?            |
| `stamp`     | Backfills the run record of stored sections that predate it.                |
| `report`    | Renders `BASELINE-<date>.md` from the JSON the other sections wrote.        |

Options: `--out DIR` (or `PERF_OUT`, default `$TMPDIR/fancy-ui-perf`), `--reps N` (default 3, effects), `--cycles N` (default 50, lifecycle), `--only svelte|react|vue`, `--component NAME` (effects and lifecycle: one component only), `--port N` (default 5355; the second framework uses the next port, always `--strictPort`), `--date YYYY-MM-DD` (report title and file name), `--measured-commit` and `--tool-commit` (override the recorded commits; needed by `stamp`), `--wait-quiet on|off` (see below; `--no-wait-quiet` is the same as `off`), `--quiet-threshold N` (1-minute load per core, default 0.5) and `--quiet-timeout-min N` (default 10).

**Waiting for a quiet machine.** `effects` and `lifecycle` are timing and memory samples, so by default each framework group starts only when the 1-minute load average divided by the core count is under the threshold. The tool polls `os.loadavg()` every 5 s, after the group's harness is built (so it does not wait on its own build). After 10 minutes it gives up, measures anyway and labels the group `loaded`. The outcome (quiet or timed out, seconds waited, the load that ended the wait) is stored in the group's run record and printed in the report's "wait for quiet" column. `--wait-quiet on` turns the wait on for any section, `off` turns it off for all.

Every section writes `<out>/<section>.json`. Raw Chrome traces of each effect go to `<out>/traces/<framework>-<component>.json` (open them in the browser's performance panel); they are large and not committed.

## Prerequisites

The repo installed (`pnpm install`), Playwright's Chromium (`pnpm exec playwright install chromium`), network access (the consumer scripts run `npm install`), `rsync`. `sizes` must run before `imports`, `effects` and `lifecycle`: they reuse the kept consumer apps it records in `<out>/state.json`. The scratch apps live under `$TMPDIR` and are not deleted by the tool.

## Environment

Quiet machine, nothing else building (the numbers are CPU time, so a parallel build shows up in them), power connected, same Node and Chromium for the runs being compared. Every section stores a run record next to its numbers: the library commit it measured (`+dirty` when files outside `scripts/perf` had edits), the commit of the tool (last commit touching `scripts/perf`), the load average when the section ended, the machine, OS, Node and package versions. `report` prints them back from the stored JSON, never from the machine it runs on. The stored JSON of the first run is committed in `scripts/perf/baselines/2026-10-21/` (`sizes.json`, `imports.json`, `effects.json`, `lifecycle.json`), and this command regenerates `BASELINE-2026-10-21.md` byte for byte from it (run from the repo root, then `prettier --check scripts/perf` is unchanged):

```bash
node scripts/perf/measure.mjs report --out scripts/perf/baselines/2026-10-21
```

Its environment tables list each section's own commits, load and wait outcome, and label a section `quiet` when the worse of its 1- and 5-minute loads at the end is below half the core count (below 7 on 14 cores), `loaded` otherwise, and always `loaded` when its wait for a quiet machine timed out. The 15-minute load is still stored and printed but does not decide: its window includes the tool's own builds. The load at the end includes the work of the tool itself (the browser, the harness build), so a group can start quiet and still end labelled `loaded`. `stamp` backfills the whole run record of results measured before it existed: the record then carries `backfilled: true`, and the report prints "(backfilled)" next to everything that comes from it (machine, OS, Node, package versions, library commit, tool commit). A backfilled record has no load of its own; the load shown for a section is the one the section stored itself. In the committed baseline, sizes and imports were measured in the first run and backfilled; none was stamped at measure time. `effects` and `lifecycle` were remeasured later the same day, at tool commit `1dc211a1` (the commit that added the wait), with their run record stored at measure time (not backfilled): each group waited until the 1-minute load per core was under 0.5 before it started. Sizes and imports have no stored load at all (`unrecorded`). Chromium runs headless with software GL (`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`), the same flags as the consumer smoke, so WebGL effects can start without a GPU. Consequence: CPU numbers cover the renderer main thread only. Shader work done in software GL happens in the GPU process and is not in them.

## Protocol

### 1. Consumer app weight (`sizes`)

For each of the six apps in `examples/consumers/` the tool runs `KEEP_CONSUMER=1 scripts/consumers/<app>.sh`: the package is built and packed once (the tarballs are shared through `CONSUMER_PACKS_DIR`), the app is copied outside the repo, installed from the tarball and built by its own build script, then the smoke runs. The kept scratch folder is parsed from the script output. Client output is measured in `dist` (Vite apps), `.svelte-kit/output/client` (SvelteKit), `.next/static` (Next) and `.output/public/_nuxt` (Nuxt). Every `.js`, `.mjs` and `.css` file is compressed on its own (gzip level 9, brotli quality 11) and summed. Source maps, fonts and HTML are ignored. The packed tarball sizes are listed as well.

Each app mounts the same seven components, so the numbers compare frameworks and meta-frameworks, not component sets.

### 2. Barrel versus deep import (`imports`)

In the kept `svelte-vite`, `react-vite` and `vue-vite` apps, the entry file is replaced by a probe that logs the imported value, and `vite build` runs with default minification. Probes: nothing (baseline), then `Button`, `Dialog`, `Select`, `BorderBeam` and `Toaster` one at a time, then all five together; each through the package barrel (`import { X } from "<package>"`) and through the component's own folder file in `node_modules/<package>/dist` (an absolute path, because the packages do not export per-component subpaths). The result is the JS added above the baseline, raw, gzip and brotli, plus the barrel-to-deep ratio and the build time. A ratio well above 1 means the barrel pulls in code the component does not use.

### 3. Effect activity (`effects`)

A harness app (the kept `svelte-vite` or `react-vite` app with `harness/<framework>-entry` as its entry, built and served with `vite preview`) exposes `window.__perf.mount(name, count)` and `unmountAll()`. `harness/instrument.js` is injected before any page script and counts animation frames requested, long tasks, WebGL contexts, listeners on long-lived targets, observers and intervals.

For each of `fluid-cursor`, `border-beam`, `displacement-text`, `mosaic-glow` and `toast` (a Toaster with 4 visible toasts), plus `none` (nothing mounted), a fresh page is opened, the component is mounted, 1.5 s is allowed to settle, then two 5 s windows are measured: `idle` (no input) and `moving` (the pointer circles over the component at about 60 Hz). Per window:

- `raf/s`: `requestAnimationFrame` calls per second;
- `CPU ms/s`: renderer main-thread task time (`Performance.getMetrics` `TaskDuration`) per second;
- `script ms/s`: the `ScriptDuration` part of it;
- long tasks: count, total and longest duration from a `PerformanceObserver`.

The table reports the median of `--reps` fresh pages. Subtract the `none` row to get the cost of the component. A separate 4 s window per component is traced with Chrome tracing (`browser.startTracing`) for the raw files; it is never used for the numbers because tracing slows the page.

### 4. Mount/unmount and instances (`lifecycle`)

On a fresh page per component, after one warm-up cycle and a forced garbage collection (baseline):

- **cycles**: mount, wait 40 ms, unmount, wait 10 ms, repeated `--cycles` times (50), then a forced GC. Reported: JS heap delta against the baseline, persistent listeners (see below), live observers, live intervals, WebGL contexts created, still attached to the document, still referenced after GC, "too many active WebGL contexts" warnings, and `requestAnimationFrame` calls in the second after unmount (should be 0);
- **ten instances**: ten mounted at once from the same baseline: heap, DOM nodes, listeners, observers, intervals, contexts, warnings, CPU ms/s and raf/s over 3 s;
- **after unmounting the ten**: the residue against the same baseline.

"Persistent listeners" counts listeners registered on `window`, `document`, `<html>`, `<body>`, `MediaQueryList` and `visualViewport`, de-duplicated like the platform does and decremented by `removeEventListener` or an aborted signal. Listeners on nodes that are removed with the component are garbage with it and are not a leak. `once` listeners are not tracked. The probe holds observers and contexts through `WeakRef` only: a strong reference would keep every disconnected observer callback, and the renderer it closes over, alive, and the tool would report its own retention as a leak (`lib.test.mjs` guards this). "Contexts retained" is a delta against the warm baseline, like "contexts created". For `toast`, one instance is one Toaster plus 4 toasts, extra instances are one toast each (the stack is a module-level singleton capped at 4 visible).

## Reading the numbers

- Sizes and import costs are deterministic for a given commit and lockfile; compare them exactly.
- Effect and lifecycle numbers are timing and memory samples. No noise figure is claimed. The first run measured the effects of both frameworks on a loaded machine (1-minute load 8.2 and 22.6 on 14 cores). `effects` and `lifecycle` were then remeasured with the wait for a quiet machine: every group started with the 1-minute load per core under 0.5 (5.0 to 6.8 on 14 cores, after waits of 0 to 95 s), but all four still end `loaded` (end loads 8.6 / 7.5, 8.4 / 9.7, 8.6 / 8.9 and 6.2 / 7.9 for 1 / 5 minutes), because the tool's own browser and builds raise the load during the run and the machine was not idle to begin with (about 3 to 5 before the first group, with desktop sessions open). The numbers in the baseline are therefore the best this machine gave, not a quiet-machine measurement, and the idle CPU ceilings and the ten-instance CPU ms/s header keep the word "provisional". Before relying on a CPU difference, remeasure on a machine with nothing else running, and rerun with more `--reps` before believing a small one.
- Headless Chromium ticks animation frames at the display rate (120 Hz on the machine of the first run), so `raf/s` of a loop that runs every frame reads about 120, not 60. Compare runs on the same display.
- A listener, interval, observer or context count that does not return to the baseline after unmount is a finding, whatever its size.
- Vue is covered by sections 1 and 2 only; the harness has Svelte and React entries.

## Proposed initial budget

The report ends with ceilings derived from the baseline. They are a starting point for a conversation, not a gate: `measure.mjs` never fails on a number.

| Metric                                                                                                                                                                                                 | Ceiling                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Each consumer app, total gzip                                                                                                                                                                          | measured + 15 %, rounded up to 1 KB   |
| Idle CPU of the worst effect, per framework                                                                                                                                                            | measured + 50 %, rounded up to 5 ms/s |
| Each probed component through the barrel, gzip                                                                                                                                                         | measured + 10 %, rounded up to 1 KB   |
| Barrel/deep gzip ratio of the worst component, per package                                                                                                                                             | 1.05                                  |
| Heap delta after the mount/unmount cycles, worst component, per framework                                                                                                                              | measured + 50 %, rounded up to 256 KB |
| Residue rows, per framework: rAF/s after unmount, persistent listeners, observers still observing, intervals still running, contexts still connected after unmount, contexts retained after the cycles | 0                                     |

The idle CPU ceiling of a framework whose effects the run record labels `loaded` (end load, or a quiet wait that timed out) is printed with the word "provisional": remeasure `effects` on a machine with nothing else running before adopting it. The ceilings now come from the remeasured run (svelte 60 ms/s, react 55 ms/s); both are still provisional because both groups end `loaded`, and so are the ten-instance CPU ms/s columns of section 4 (header "CPU ms/s (provisional: loaded machine)"). Sections that read `quiet` lose the label.

## Files

| File                     | Role                                                     |
| ------------------------ | -------------------------------------------------------- |
| `measure.mjs`            | The tool.                                                |
| `lib.mjs`                | Pure helpers (sizes, rates, tables), unit-tested.        |
| `lib.test.mjs`           | `node --test scripts/perf/lib.test.mjs`                  |
| `harness/instrument.js`  | Counters injected into the page.                         |
| `harness/*-entry.*`      | Harness entry points copied into the kept consumer apps. |
| `BASELINE-2026-10-21.md` | Result of the first run.                                 |
