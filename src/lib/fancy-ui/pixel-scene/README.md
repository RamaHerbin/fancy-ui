# PixelScene

An animated pixel-art landscape painted on a dot grid. At rest only sparse ink dots and the lit cells show; a round lens that follows the pointer reveals the picture in full colour, with a dithered rim. Four scenes (`alpine`, `meadow`, `sea`, `mountains`), each with complete day and night palettes. On HDR displays the sun, moon, windows, stars, fireflies and the lens field are redrawn as hard squares brighter than SDR white.

```svelte
<script lang="ts">
	import { PixelScene } from "fancy-ui-svelte";
</script>

<PixelScene scene="alpine" class="h-[340px] w-full rounded-2xl" />
```

The host needs a height — it fills whatever box you give it.

## Props

| Prop         | Type                                           | Default          | Description                                                                                |
| ------------ | ---------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `scene`      | `"alpine" \| "meadow" \| "sea" \| "mountains"` | `"alpine"`       | Which landscape to paint.                                                                  |
| `night`      | `boolean`                                      | `false`          | Night palette: stars, moon, lit windows. The component never changes it.                   |
| `cell`       | `number`                                       | `5`              | Grid pitch in CSS px, clamped to 4–32. Very large boxes use a coarser pitch (see below).   |
| `dot`        | `number`                                       | `4`              | Edge of each square dot in CSS px, at most `cell`.                                         |
| `lens`       | `boolean`                                      | `true`           | Show the picture in full colour under a round lens that follows the pointer.               |
| `lensRadius` | `number`                                       | `21`             | Lens radius in cells (clamped 2–200).                                                      |
| `hdr`        | `boolean`                                      | `true`           | On a display that reports HDR, redraw the lit cells above SDR white in a WebGPU layer.     |
| `hdrLook`    | `"calibrated" \| "vivid"`                      | `"calibrated"`   | Calibrated levels (sRGB), or a hotter, wider-gamut look (display-p3), to compare.          |
| `ink`        | `string`                                       | `"currentColor"` | Colour of the resting dots. `currentColor` is read from the host, so it follows the theme. |
| `paused`     | `boolean`                                      | `false`          | Freeze clouds, birds and lights; the lens still follows the pointer.                       |
| `wave`       | `boolean`                                      | `true`           | Play a change of `night` as a dithered wave from the sun (instant under reduced motion).   |
| `surfaces`   | `readonly [day: string, night: string]`        | —                | Background painted by the scene for each theme; the wave carries it. Default transparent.  |
| `inks`       | `readonly [day: string, night: string]`        | —                | Dot colour for each theme, swapped by the wave. Overrides `ink`.                           |
| `class`      | `string`                                       | —                | Additional classes on the host. Give it a height.                                          |
| `children`   | `Snippet`                                      | —                | Copy rendered above the picture.                                                           |
| `ref`        | `HTMLDivElement \| null`                       | `null`           | Bindable host element.                                                                     |

Any other attribute (`id`, `aria-*`, `onclick`…) lands on the host.

## Anatomy

```
div.pixel-scene              host: relative, overflow-hidden; data-scene, data-night, data-hdr
├── canvas                   the 2D picture — absolute inset-0, pointer-events: none, aria-hidden
├── canvas.pixel-scene__hdr  HDR squares — only after mount, only on capable displays
└── div.pixel-scene__content relative z-1 — your children (only when provided)
```

Pointer listeners sit on the host, so the lens keeps working over your copy. Every scene leaves the top-left corner open (sky, thinned ink) for a kicker, a heading and a line of text; on HDR displays the lens is not boosted there (42 % of the width, 52 % of the height), so the copy keeps its contrast.

## Night, and the click pattern

`night` is a plain one-way prop: the component reads it and never writes it. Own the state and wire whatever should flip it — a click on the picture, a button, the site theme. A clickable `div` is not focusable, so keep a real button in the copy for keyboard users:

```svelte
<script lang="ts">
	import { PixelScene } from "fancy-ui-svelte";

	let night = $state(false);
</script>

<PixelScene
	{night}
	onclick={() => (night = !night)}
	class="h-[340px] w-full cursor-pointer rounded-2xl"
>
	<div class="pointer-events-none absolute top-9 left-9 max-w-[460px]">
		<p class="text-xs tracking-[0.28em] uppercase opacity-70">Field notes</p>
		<h2 class="mt-1 text-4xl font-semibold tracking-tight">First snow on the ridge</h2>
		<button
			type="button"
			class="pointer-events-auto mt-3 rounded-full border px-3 py-1 text-sm"
			aria-pressed={night}
			onclick={(e) => {
				e.stopPropagation();
				night = !night;
			}}
		>
			Night
		</button>
	</div>
</PixelScene>
```

### The wave

With `wave` (on by default), a change of `night` is not a cut: the new palette spreads from the sun, or the moon, or the pointer when the scene has neither, over 1.3 s (ease in-out cubic). The front is a grid-aligned staircase led by a 9-cell halo, Bayer-dithered from a sparse yellow fringe to a dense pink rim, the same grammar as SunSwitch's wave. Both palettes are painted each frame and composited cell by cell, ink included, so the scene keeps moving under the front. On HDR displays every halo cell is a hard square at `1.5 + 3.4 × depth` (4.9 at the rim), and a 7-cell glow of dithered HDR cells lies on each side of the band (pink inside the rim, yellow past the fringe, density `(1 − d)^1.7`, no blur); both stay SDR inside the copy corner.

By default the canvas is transparent and the host's background shows through. With `surfaces` and `inks` the scene owns its colours for both themes: the canvas paints the old surface, the new surface over whole cells behind the front (a grid-aligned staircase), and the dots in the ink of their side, so a click carries the whole card from day to night. The "Hours of low light" example does this, with copy that changes colour once the front has passed it. A second change mid-wave lands the running one and starts the next. The wave also plays while `paused` (the scene clock stays frozen), never under reduced motion.

## How it paints

Each frame a scene painter fills the whole grid through one call, `put(x, y, colour, inkAlpha, lit, haloCells)`:

- `colour` is what the lens shows;
- `inkAlpha` is the resting dot drawn outside the lens in the `ink` colour (×0.85 by day, ×0.6 at night; 0 = no dot);
- `lit`: `false` is a plain cell, `true` shows the colour outside the lens too, a number also makes it an HDR light at that multiple of SDR white;
- `haloCells > 0` makes the cell an emitter: the cells around it light up as Bayer-dithered hard squares whose density and brightness fall with distance.

Under the lens every cell is painted in colour; its rim is dithered on the grid. Everything is a square: no blur, no gradient between cells, no glow sprite. Colours are packed integers, so no CSS string is built per cell.

## HDR

With `hdr` (on by default), PixelScene checks after mount whether WebGPU exists and the display reports `(dynamic-range: high)`. Only then does it render a second canvas and start `pixel-scene-hdr.ts`: `rgba16float`, `colorSpace: "srgb"`, `toneMapping: { mode: "extended" }`. After every painted frame each cell with a glow is redrawn there as an instanced square at `glow ×` its colour, alpha 1. The canvas reads extended (gamma-encoded) sRGB, so each channel is sent as `encode(linear(c) × glow)`: a glow of 1 reproduces the 2D dot exactly. Levels: lens field 1.6, lit cells 1.5, snow caps and flowers 1.8, water sparkle 2.2, stars and moon 3.5, the day sun, windows and lamps up to 4.9 (≈ 1000 nits against a 203-nit SDR white), the peak every glow is clamped to.

One exception to the hard squares, for the lit windows of houses at night: the mountains cabin (radius 1.6 cells) and the alpine chalets (1.2) carry a soft golden halo in the HDR layer, `exp(−d / radius)` around the square, the warm glow of the first prototype. Every other light is squares only.

`hdrLook="vivid"` keeps a second rendering to compare against: `colorSpace: "display-p3"`, and each channel is sent as `linear(c) × (1 + (glow − 1) × 0.45)` without the encoding step. The canvas reads that as encoded, so lights land far hotter (lamps reach the panel peak) and colours more saturated, as in the first prototype; the 0.45 scale brings the calibrated levels back to the prototype's (stars 3.5 → 2.1, sun 4.9 → 2.8). On SDR screens both looks are the same picture.

One GPU device is shared by every instance on the page and released with the last one. The host gets `data-hdr` while the layer runs. If the device is lost (GPU process restarted, driver reset), the layer is torn down and started again after 600 ms, then 1.2 s, then 1.8 s; after three losses the HDR canvas is dropped and the 2D picture carries on alone. Elsewhere nothing is created.

To exercise the path in a headless browser, start it with WebGPU enabled and stub the media query before the page loads (`window.matchMedia` returning `matchMedia("all")` for `(dynamic-range: high)`); emulating the media feature through the devtools protocol has no effect.

## Reduced motion

With `prefers-reduced-motion: reduce` the scene is frozen (constant time) and the lens snaps to the pointer instead of easing. There is no animation loop: one paint per pointer event, prop change or theme change, and a `night` change is a cut, without the wave. The picture itself is still painted.

## Performance

The engine sleeps when there is nothing to do: no animation frame is requested while the host is off-screen, the tab is hidden, or the scene is `paused` with the lens at rest. Measured scene + halo cost per frame at 256×68 cells (1280×340 CSS px, Node, one core): alpine 1.3–1.5 ms, meadow 0.3–0.4 ms, sea 0.3 ms, mountains 0.4–0.5 ms; the 2D pass measured 0.4–0.5 ms at that size in a browser on the prototype engine.

A frame is capped at about 72 000 cells: past that the pitch grows (`dot` keeps its ratio). 1600×900 stays at 5 px, 1920×1080 uses 6 px, 2560×1440 uses 8 px — a full-viewport hero gets coarser pixels on purpose.

Each canvas backing store is capped at about 4.2 million device pixels (2048²): past that it is drawn at DPR 1 and upscaled with `image-rendering: pixelated`, so the squares stay hard and a 2560×1440 hero on a 2× display holds 15 MB (2D) and 29 MB (HDR) instead of 56 MB and 112 MB.

## Design decisions

- **Hard squares only.** Light around emitters is made of cells, dithered; there is no soft halo anywhere.
- **Packed colours and typed arrays.** One `Int32Array` of `0xRRGGBB` per frame, `fillStyle` set only when the colour changes.
- **Engine-owned observers.** Resize, intersection, visibility, reduced motion and the pointer are handled in the framework-free core, so the Svelte, React and Vue wrappers stay thin and cannot drift.
- **HDR canvas after mount.** Server and first client render emit the 2D canvas only, so hydration never depends on the display.

## Gotchas

- The HDR canvas appears only after mount, unlike components that render it up front.
- Sprites have fixed sizes in cells: below about 480×200 CSS px the scenes crowd and overlap.
- While the loop sleeps (`paused` or reduced motion, lens at rest), a `currentColor` ink still follows the theme: a class, style or `data-theme` change on `<html>` or a colour-scheme change repaints at once, and a slow 500 ms check (no animation frame) catches a colour changed anywhere else up the tree.
- The night palettes are made for a dark surface: on a light page the stars and the moon are near-invisible outside HDR. Give the host a dark background at night, or derive `night` from your theme.
- `ink` takes a canvas colour (`#hex`, `rgb()`, a named colour, or `currentColor`); a `var(--x)` is not resolved.
- The host is `overflow-hidden`; popovers inside it are clipped.

## Known gaps

- HDR levels were judged on one display only.
- No server-rendered picture: the canvas paints after hydration.
- The scene set is fixed; there is no custom painter API in v1.
