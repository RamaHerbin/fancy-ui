# SunSwitch

A theme switch drawn as a sun made of square dots. At rest the day sun shows
its colours and the night sun is a faint ink silhouette. Hover it and a soft
lens follows the pointer, showing the true colours underneath. Click it and the
new theme spreads from the sun across the page: the edge of the new theme is a
staircase that steps one cell at a time, and a dithered halo in the sun's four
colours rides ahead of it. On the page, this runs as a view transition.

The component never changes your theme itself. It reports the new value through
`onCheckedChange`, which runs inside the transition, and you flip your theme
there.

## Usage

```svelte
<script>
	import { SunSwitch } from "fancy-ui-svelte";

	let day = $state(true);
</script>

<SunSwitch
	bind:checked={day}
	onCheckedChange={(next) => document.documentElement.classList.toggle("dark", !next)}
	sound
/>
```

`onCheckedChange` must flip the theme **synchronously**. The transition takes
its "new" snapshot as soon as the callback returns. A theme that you apply
later (after an `await`, in a `setTimeout`, or in an effect) never appears
inside the wave. If your theme lives in a framework store, commit it inside
the callback.

### Contained

`mode="contained"` keeps the wave inside one element and leaves the page alone.
The `scope` element needs `position: relative` and `overflow: hidden`.

```svelte
<script>
	import { SunSwitch } from "fancy-ui-svelte";

	let card = $state(null);
	let day = $state(true);
</script>

<article bind:this={card} class="relative overflow-hidden {day ? 'light-card' : 'dark-card'}">
	<SunSwitch bind:checked={day} mode="contained" scope={card} />
</article>
```

### Any trigger: `pixelWave`

The wave is also exported on its own. Any trigger can start it.

```ts
import { pixelWave } from "fancy-ui-svelte";

await pixelWave({
	origin: { x: event.clientX, y: event.clientY }, // viewport px (scope-local px when contained)
	apply: () => document.documentElement.classList.toggle("dark"),
});
```

`pixelWave` calls `apply` exactly once and never rejects. It accepts `mode`,
`scope`, `fill`, `cell`, `dot`, `haloCells`, `duration`, `palette`, `ease`,
`reducedMotion`, `hdr`, `live` and `liveHdr`. `live` names an element that keeps
rendering live above the transition, so it is not frozen in the old snapshot;
`liveHdr` does the same for a second element drawn above it. `isWaving()`
reports whether a wave is running. `WAVE_CSS` is the stylesheet that
`pixelWave` adds to the document on its first wave. It is exported for reference;
you do not need to include it yourself. Its rules only apply while
`html[data-fancy-sun-waving]` is set, so your other view transitions keep their
own animations.

## Props

| Prop              | Type                               | Default        | Description                                                                                                                                               |
| ----------------- | ---------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checked`         | `boolean`                          | `true`         | Day (`true`) or night (`false`). Bindable                                                                                                                 |
| `onCheckedChange` | `(checked: boolean) => void`       | —              | Called with the new value inside the transition's update callback. Flip your theme here, synchronously                                                    |
| `radius`          | `number`                           | `10`           | Sun radius in cells. The canvas is `2 × radius + 1` cells square                                                                                          |
| `cell`            | `number`                           | `5`            | Grid pitch in CSS pixels, shared by the sun, the wave front and its halo                                                                                  |
| `dot`             | `number`                           | `4`            | Side of each square dot in CSS pixels (at most `cell`)                                                                                                    |
| `palette`         | `[string, string, string, string]` | `SUN_PALETTE`  | Four colours from the top of the sun to the bottom. The halo reuses them: densest rim in the last, sparse fringe in the first                             |
| `ink`             | `string`                           | `currentColor` | Monochrome colour of the sun outside the lens at night and of the horizon. Resolved from the computed colour, so it follows the theme                     |
| `nightAlpha`      | `number`                           | `0.42`         | Opacity of the ink sun at night                                                                                                                           |
| `horizon`         | `boolean`                          | `true`         | Draws a few sparse rows of dots under the sun for the lens to reveal                                                                                      |
| `lens`            | `boolean`                          | `true`         | On hover (or keyboard focus) a soft round lens shows the true colours                                                                                     |
| `lensRadius`      | `number`                           | `7`            | Lens radius in cells. About two thirds of `radius` reads best                                                                                             |
| `mode`            | `"document" \| "contained"`        | `"document"`   | `document` runs the wave over the whole page. `contained` paints it over `scope` only                                                                     |
| `scope`           | `HTMLElement \| null`              | `null`         | The element the wave covers in contained mode. Needs `position: relative` and `overflow: hidden`                                                          |
| `fill`            | `string`                           | —              | Colour of the old-state sheet (contained mode and browsers without view transitions). Defaults to the first opaque background from `scope` (or `body`) up |
| `duration`        | `number`                           | `1300`         | Duration of the wave in milliseconds (ease in-out cubic)                                                                                                  |
| `haloCells`       | `number`                           | `9`            | Thickness of the dithered halo leading the wave front, in cells                                                                                           |
| `hdr`             | `boolean`                          | `true`         | On HDR displays with WebGPU, the sun and the wave halo glow above SDR white as hard squares                                                               |
| `sound`           | `boolean`                          | `false`        | Plays the toggle cue (on for day, off for night) once the user has enabled sound                                                                          |
| `label`           | `string`                           | `"Day mode"`   | Accessible name. The checked state is announced as on or off                                                                                              |
| `disabled`        | `boolean`                          | `false`        | Blocks interaction                                                                                                                                        |
| `class`           | `string`                           | —              | Merged over the button's classes                                                                                                                          |
| `ref`             | `HTMLButtonElement \| null`        | `null`         | The native button. Bindable                                                                                                                               |

Every other attribute and listener of a `<button>` is passed through. A
consumer `onclick` runs after the switch has started its wave.

## How it works

- **Shared cores.** The drawing and the wave live in two framework-free
  modules, `sun-switch-core.ts` (sun raster, dithering, staircase, lens,
  painter) and `pixel-wave-core.ts` (the wave). The Svelte, React and Vue
  packages carry byte-identical copies.
- **The sun** is drawn on a Canvas 2D at device-pixel resolution, one square
  dot per cell. Its four colour bands cover the rows above the horizon. By
  day the disc is tinted slightly toward the ink, so the lens shows the pure
  colours on it too. `horizon` adds a dotted line and three dashed reflection
  rows below it. The render loop sleeps
  when nothing moves, when the switch is off screen and when the tab is
  hidden.
- **The lens** eases its radius in (about 140 ms) and out (about 260 ms) and
  follows the pointer with a frame-rate independent lerp. Touch opens it at
  the touch point. Keyboard focus opens it on the centre of the sun. It stays
  open for the whole wave.
- **The wave** starts at the centre of the sun and grows to the farthest
  corner plus the halo, over `duration` with ease in-out cubic. In `document`
  mode, `apply` runs inside `document.startViewTransition`. Each frame clips
  `::view-transition-new(root)` with a staircase polygon on the switch's own
  grid, and paints the halo on a fixed canvas above everything. Each halo cell
  is drawn when its Bayer 4×4 threshold is under `D^0.7`, where `D` is the
  depth into the band. The switch's canvas renders live above the snapshots:
  cells the front has passed use the new ink, the others keep the old one.
- **HDR.** With `hdr` (on by default), the switch checks after mount whether
  WebGPU exists and the display reports `(dynamic-range: high)`. Only then does
  it lay a second canvas over the sun (`sun-switch-hdr.ts`: `rgba16float`,
  `colorSpace: "srgb"`, `toneMapping: { mode: "extended" }`) and redraw the
  painted squares there at `glow ×` their colour: the day sun at 2.2, sun cells
  under the lens at 4.9, horizon cells under the lens at 1.6. The wave halo
  gets its own WebGPU canvas over the halo canvas, each square at
  `1.5 + 3.4 × D`, so the dense inner rim reaches 4.9 (about 1000 nits against
  a 203-nit SDR white) and the sparse fringe stays near SDR. The canvas reads
  extended (gamma-encoded) sRGB, so each channel is sent as
  `encode(linear(c) × glow)`: a glow of 1 is the 2D dot exactly. Squares only,
  no blur. One GPU device is shared by the page; if it is lost, the layer is
  started again after 600 ms, 1.2 s, then 1.8 s, and after three losses the
  2D picture carries on alone. The host gets `data-hdr` while the layer runs.
- **Second click.** A click during a wave cancels it and applies the new value
  at once. Clicks are never dropped. A click made while a page view transition
  is running is caught on the document (the transition hit-tests every point
  as `<html>`) and still reaches the switch.
- **No strobing.** The theme flips at most three times a second. Clicks that
  come sooner are queued and applied, with the latest intent, when the gap
  allows. An auto-repeated Enter or Space (a held key) is ignored.
- **Reduced motion.** The theme changes in the same frame, with no halo and no
  transition. The lens still opens, without easing.
- **Accessibility.** A native `<button role="switch">` with `aria-checked`,
  `aria-label` and `aria-busy` during its wave. Enter and Space toggle it.
  Focus stays on the button through the transition. The canvas is
  `aria-hidden`. The halo is a single expanding ring that never flashes the
  screen.
- **Contrast.** With the default `nightAlpha` of 0.42, the night sun sits at
  or above 3:1 against both a near-black page and a white one, the ratio WCAG
  asks of a state indicator (0.34 measured about 2.8:1 and 2.3:1). Going lower
  reads as quieter but drops under that line. The state is also carried by
  colour versus grey and by `aria-checked`. By day the tinted palette is darker
  than the raw colours, but its yellow band stays light on a white page.

## Styling hooks

- `data-state="day" | "night"` on the button, `data-waving` during its own
  wave and `data-hdr` while the HDR layer runs.
- `--ft-accent` colours the focus ring (falls back to `currentColor`).
- `html[data-fancy-sun-waving]` is set during a page wave.

## Limits

- **`contained` mode** keeps the old look with a static copy of `scope`, taken
  just before `apply` and removed when the wave ends. The copy is inert and
  hidden from assistive tech. Ids, form names, iframes, media and scripts are
  left out of it. Canvases are copied pixel for pixel; a WebGL canvas without
  `preserveDrawingBuffer` copies blank. Inputs show their initial values, and
  the copy shows `scope` scrolled to the top.
- **Without view transitions** (or without `clip-path: path()` support in
  contained mode), the wave is painted over a sheet of the old background
  colour, with a staircase hole. The old content is hidden under that flat
  sheet from the first frame. Only the switch itself is drawn on the sheet.
- **Clip animation support.** Animating `::view-transition-new(root)` needs
  `Element.animate()` with `pseudoElement`. Where that throws, the theme flips
  at once and only the halo sweeps over the page.
- **HDR during a view transition.** In `document` mode the HDR halo and the
  HDR sun are named elements of the transition, so they render through the
  browser's transition snapshots. A browser that composites those snapshots in
  SDR shows the halo at SDR white until the wave ends; the contained and sheet
  paths draw it directly.
- **One wave at a time.** Waves are global. A second one, from any switch or
  from `pixelWave`, ends the running one first.
- **Sound** uses the library's `toggle-on` / `toggle-off` cues. There is no
  custom cue for the wave.
- **Browser chrome is yours to update.** `meta[name="theme-color"]` and
  `color-scheme` are not touched. Set them in `onCheckedChange` if your site
  uses them.
- **Resizing during a wave is ignored.** The wave's size is measured when it
  starts.
