# FluidCursor

A WebGL-based fluid simulation that follows the cursor, creating beautiful flowing color effects.

## Features

- WebGL2 fluid simulation with WebGL1 fallback
- Optional HDR mode rendered by a WebGPU engine (wide gamut + extended tone mapping)
- Mouse and touch support
- Configurable simulation parameters
- Transparent background support
- Automatic canvas resizing
- Controllable fluid colors via hex strings (fixed color, palette cycling, or random)

## Implementation Notes

### Svelte 5 Implementation

1. **Lifecycle**: Used `onMount` with cleanup return instead of Vue's `onMounted` + `watch`
2. **Refs**: Used `bind:this` for canvas reference instead of Vue's `ref()`
3. **Props**: Used Svelte 5 `$props()` syntax with defaults
4. **Cleanup**: Properly cancel animation frame and remove event listeners on unmount

### WebGL Implementation

The component implements a full Navier-Stokes fluid simulation with:

- Curl/vorticity computation
- Pressure solving with iterative Jacobi method
- Advection for both velocity and dye
- Gradient subtraction for incompressible flow

## Color Props

| Prop             | Type                            | Default                  | Description                                          |
| ---------------- | ------------------------------- | ------------------------ | ---------------------------------------------------- |
| `fluidColor`     | `string` (hex)                  | —                        | Fixed fluid color. Disables random cycling.          |
| `fluidColors`    | `string[]` (hex)                | —                        | Palette to cycle through on each splat.              |
| `colorIntensity` | `number`                        | `0.15`                   | Intensity multiplier applied to fluid colors (0–1).  |
| `backColor`      | `{ r, g, b }` or `string` (hex) | `{ r: 0.5, g: 0, b: 0 }` | Background color — accepts RGB object or hex string. |

**Priority**: `fluidColor` > `fluidColors` > random HSV

### Examples

```svelte
<!-- Fixed teal fluid -->
<FluidCursor fluidColor="#00ffcc" />

<!-- Cycling palette -->
<FluidCursor fluidColors={["#ff0080", "#00ffcc", "#7700ff"]} colorIntensity={0.3} />

<!-- Hex background -->
<FluidCursor backColor="#1a1a2e" />
```

### Contained-mode splat scaling

`splatRadius` is defined as a fraction of the canvas, which would make the
effect look tiny inside small containers (e.g. docs demos). In `contained`
mode both engines grow the aspect-corrected radius with the
viewport/container height ratio — sub-linearly in apparent size (×√k), so a
small demo reads bigger without mimicking fullscreen 1:1 — capped at ~30% of
the container height (`scaleRadiusForContainer` in `fluid-shared.ts`).
Fullscreen and viewport-sized containers are unaffected.

### Event Handling

- Window-level mouse/touch events for full-screen tracking
- First-move handlers to start animation only when user interacts
- Proper cleanup of all event listeners on component unmount

## HDR Mode

```svelte
<FluidCursor hdr hdrBoost={2} fluidColors={["#a142ff", "#42cfff"]} />
```

With `hdr` enabled the component tries a WebGPU engine (`webgpu-engine.ts`, a
WGSL port of the same simulation) that renders into an `rgba16float` canvas
configured with `colorSpace: "display-p3"` and `toneMapping: { mode: "extended" }`.
On an HDR display, dye values pushed above `1.0` by `hdrBoost` render brighter
than SDR white; on a wide-gamut (P3) display colors are noticeably more
saturated even without HDR headroom.

| Prop       | Type      | Default | Description                                                                          |
| ---------- | --------- | ------- | ------------------------------------------------------------------------------------ |
| `hdr`      | `boolean` | `false` | Opt into the WebGPU HDR engine with automatic fallback.                              |
| `hdrBoost` | `number`  | `1.5`   | Display exposure multiplier, clamped to `[1, 4]`. Only applied by the WebGPU engine. |

### Support cascade

The component degrades silently (the level is logged to the console in dev):

1. **`webgpu-hdr`** — WebGPU available: float16 backbuffer, P3, extended tone
   mapping (Chrome/Edge 129+, Safari 26+; browsers that ignore `toneMapping`
   still get the float16 + P3 rendering, clamped to SDR).
2. **`webgl-p3`** — no WebGPU: the regular WebGL engine with
   `drawingBufferColorSpace = "display-p3"` (Chrome/Edge 104+, Safari 16.4+,
   Firefox 132+). Wide gamut only, no extra brightness; `hdrBoost` is ignored.
3. **`sdr`** — everything else: the unchanged default rendering.

Notes:

- Colors are intentionally reinterpreted in P3 space rather than converted
  from sRGB — the resulting saturation push is the point of the effect.
- The glow requires an HDR-capable display (`matchMedia("(dynamic-range: high)")`).
  On SDR displays HDR mode is still safe, just clamped.
- With `hdr={false}` (the default) the WebGPU code path is never taken and
  rendering is identical to previous versions.

## Bitmap Dithering (experimental)

```svelte
<FluidCursor dither ditherPixelSize={3} ditherLevels={4} fluidColors={["#a142ff", "#42cfff"]} />
```

With `dither` enabled the display pass renders the fluid as a retro ordered-dither
bitmap: the dye is snapped to a chunky pixel grid (each cell samples the dye at its
center, so cells render as solid square dots) and each color channel is quantized
against a procedural 4×4 Bayer matrix. Dot density encodes brightness while hues
are preserved. Cells that quantize to black stay fully transparent, so the effect
composites cleanly over any background.

| Prop              | Type      | Default | Description                                                            |
| ----------------- | --------- | ------- | ---------------------------------------------------------------------- |
| `dither`          | `boolean` | `false` | Enable the ordered-dither display pass. Forces the WebGL renderer.     |
| `ditherPixelSize` | `number`  | `3`     | Size of one dithered pixel in CSS pixels, minimum `1`.                 |
| `ditherLevels`    | `number`  | `4`     | Color levels per channel, clamped to `[2, 16]`. Lower = more dithered. |

Notes:

- `dither` forces the WebGL renderer — `hdr` is ignored while it is set.
- Like the other simulation props, dither props are applied at mount; re-key the
  component to change them at runtime.
- Raise `colorIntensity` (≈ `0.4`+) so the dye reliably crosses the first
  quantization step; at the default `0.15` dots stay sparse.
