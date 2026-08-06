# LiquidText

Large display text that liquefies under the cursor: a raw-WebGL fluid velocity
field displaces the text's UVs along the pointer's trail, with RGB chromatic
fringing on the warped edges, then relaxes back to rest as the fluid decays.

## Features

- Raw WebGL2 (WebGL1 fallback) fluid simulation — no Three.js dependency
- Any string rendered through the sim: text is rasterized to a texture via
  Canvas2D (`fillText`), not a pre-baked image
- Mouse-velocity-driven splats: faster cursor movement = stronger smear
- Chromatic aberration on displaced edges (3-tap R/G/B sampling)
- Self-relaxing: velocity field decays every frame, so the smear resolves on
  its own roughly a second after the cursor moves away
- Auto-fit font size to the container width when `fontSize` is unset
- Graceful fallbacks: `prefers-reduced-motion`, no WebGL, and small viewports
  (`staticBelow`) all render plain styled static text instead of the sim
- Accessible by construction: a real text node is always present in the DOM;
  only the `<canvas>` is `aria-hidden`
- Single `requestAnimationFrame` loop, paused via `visibilitychange` when the
  tab is hidden (`pauseWhenHidden`)
- Exhaustive cleanup on unmount: cancels the rAF loop, removes every
  listener, disconnects the `ResizeObserver`, and calls `WEBGL_lose_context`

## Usage

```svelte
<script>
	import { LiquidText } from "fancy-ui-svelte";
</script>

<LiquidText text="Liquid" class="text-7xl font-bold" />
```

```svelte
<!-- Tuned for a subtler, slower-decaying smear -->
<LiquidText
	text="Rama Herbin"
	font="Bricolage Grotesque, sans-serif"
	fontWeight={700}
	strength={0.35}
	radius={120}
	dissipation={0.985}
	lightColor="#0a0a0a"
	darkColor="#fafafa"
/>
```

```svelte
<!-- Force the static DOM fallback (e.g. inside a `prefers-reduced-motion`
     conscious layout, or below a custom breakpoint) -->
<LiquidText text="Liquid" interactive={false} staticBelow={1280} />
```

## Props

| Prop             | Type                 | Default     | Description                                                                          |
| ---------------- | -------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `text`           | `string`             | `"Liquid"`  | The text rendered into the fluid texture (or as static fallback text).                 |
| `font`           | `string`             | `""`        | CSS font-family for the text. Empty string resolves to `getComputedStyle(host).fontFamily`. |
| `fontSize`       | `number`             | `0`         | Font size in px. `0` auto-fits the text to the container's width.                     |
| `fontWeight`     | `number \| string`   | `700`       | CSS font-weight for the rasterized/fallback text.                                     |
| `lightColor`     | `string`             | `"#000000"` | Text color used in light mode.                                                        |
| `darkColor`      | `string`             | `"#ffffff"` | Text color used in dark mode.                                                          |
| `class`          | `string`             | `""`        | Additional class names applied to the root element.                                  |
| `strength`       | `number`             | `0.5`       | Geometric UV warp gain — how far the fluid velocity displaces the text's UVs.         |
| `radius`         | `number`             | `160`       | Splat radius in screen pixels around the pointer.                                    |
| `forceGain`      | `number`             | `17`        | Multiplier from mouse-delta-per-frame to splat force.                                 |
| `dissipation`    | `number`             | `0.98`      | Per-frame velocity decay factor (relax-back rate for the smear).                      |
| `viscosity`      | `number`             | `4`         | Viscous diffusion strength (Jacobi iteration, 8 iters).                               |
| `chromaticRatio` | `number`             | `0.2`       | Chromatic offset = warp amount × this ratio.                                         |
| `staticBelow`    | `number`             | `1024`      | If `window.innerWidth <= staticBelow` at mount, render static DOM text instead.       |
| `interactive`    | `boolean`            | `true`      | Whether the fluid sim reacts to pointer movement.                                     |
| `pauseWhenHidden`| `boolean`            | `true`      | Pause the render loop via `visibilitychange` when the tab/page is hidden.             |

## Behavior contract

- A real text node is **always** in the DOM: a `sr-only` span while the
  canvas is actively driven, or visible styled text in any fallback mode.
- The `<canvas>` is always `aria-hidden="true"` — it is a visual effect
  layer, not content.
- The component falls back to plain styled DOM text (no WebGL sim, no rAF
  loop) when any of these are true at mount: `prefers-reduced-motion` is
  preferred, WebGL is unavailable, or `window.innerWidth <= staticBelow`.
- Root markup shape: `<div class={...}>` wrapping the canvas and the text
  node.

## Implementation notes

### Fluid simulation

- Runs the velocity solve at **0.25× the canvas resolution** to keep the
  per-frame cost low for a text-sized effect (this doesn't need dye-buffer
  resolution the way a full-screen cursor effect does).
- Pipeline per frame: self-advection with `dissipation` decay → pointer-velocity
  splat (screen-px falloff `(1 - dist/radius)² × 1.5`, force ∝ mouse delta ×
  `forceGain`) → viscous diffusion (Jacobi, `viscosity`, 8 iterations) →
  divergence → pressure solve (Jacobi, 16 iterations) → gradient
  subtraction/projection. Vorticity confinement is intentionally left out —
  it isn't part of the reference behavior being reproduced and would add
  cost without visible benefit at this scale. `dt` is fixed rather than
  measured from real frame time, so the decay rate stays predictable
  regardless of frame rate.
- Text is rasterized once per (text, font, fontSize, fontWeight) combination
  via Canvas2D `fillText` into a texture, and re-rasterized on `ResizeObserver`
  changes that affect layout (e.g. auto-fit font size).

### Chromatic sampling

- The fragment shader reads the velocity field at the screen UV, derives a
  geometric warp (`velocity * strength`) and a chromatic offset
  (`warp * chromaticRatio`), then does 3 independent texture taps: red at
  `uv - offset`, green at `uv`, blue at `uv + offset`. The result is a
  visible RGB fringe exactly where the text is being smeared, which
  disappears as the velocity field dissipates.

### Fallbacks

- `prefers-reduced-motion: reduce` and "no WebGL context available" both
  short-circuit straight to the static DOM text path — no canvas sim is
  initialized, no rAF loop starts.
- `staticBelow` is checked once against `window.innerWidth` at mount (not
  reactively re-checked on resize) — crossing the breakpoint after mount
  does not retroactively swap modes.
- All three fallback conditions render the same static markup: visible,
  normally-styled text using `lightColor`/`darkColor` per color scheme.

### Cleanup

- A single `requestAnimationFrame` loop drives the sim; it is paused (not
  cancelled) on `document.visibilitychange` when `pauseWhenHidden` is true,
  and resumed when the tab becomes visible again.
- On unmount: cancels the pending rAF, removes every `window`/`document`
  listener the component registered, disconnects the `ResizeObserver`, and
  explicitly calls the `WEBGL_lose_context` extension's `loseContext()` to
  release GPU resources deterministically rather than waiting on GC.
- Verified safe under repeated mount/unmount (no leaked listeners, no
  dangling animation frames) — see `LiquidText.test.ts`.
