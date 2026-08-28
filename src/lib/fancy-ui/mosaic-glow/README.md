# MosaicGlow

A cursor-lit canvas mosaic. A dark surface tiled with small squares; a soft halo follows the pointer with a slight lag and lights the tiles under it to random intensities. Lit tiles fade slowly, so the pointer leaves a comet trail. An additive bloom bleeds over the gaps, a glassy highlight sits on every tile, and a scattering of faint tiles stays visible outside the halo. With nobody pointing, the halo wanders on its own.

```svelte
<script lang="ts">
	import { MosaicGlow } from "fancy-ui-svelte";
</script>

<MosaicGlow class="h-80 w-full rounded-2xl">
	<div class="flex h-full items-center justify-center text-white">Hello</div>
</MosaicGlow>
```

The host needs a height — it fills whatever box you give it.

## Anatomy

```
div.mosaic-glow            host: relative, overflow-hidden, background-color
├── canvas                 absolute inset-0, pointer-events: none, aria-hidden
└── div.mosaic-glow__content   relative z-1 — your children (only when provided)
```

Pointer listeners sit on the host, so moving over your content still drives the halo.

## How it animates

Per-tile state lives in typed arrays (`mosaic-glow-core.ts`):

- `weight` — how strongly a tile responds to the halo, `[1 - noise, 1]`, seeded by `(seed, col, row)` so a resize never reshuffles the field.
- `ambient` — the faint resting brightness, cubic-skewed so most tiles sit near black.
- `heat` — the current lit level driven by the halo.

Each frame: `target = falloff(distance / radius) · weight`, then `heat` moves toward `target` with a fast attack (τ ≈ 40 ms) and a slow release (τ = 0.05 + 0.7·trail s). The exponential approach is time-based, so the trail reads the same at 30 or 120 fps. The halo position itself lerps toward the pointer (τ = 0.8·smoothing s) — that lag plus the slow release is what makes the comet.

Colours come from a 64-entry lookup table built once per `color`/`background`: a hair above the surface at 0, the halo colour at 55 %, a near-white tint at 100 %. `intensity` scales at sampling time, so the slider never rebuilds the table.

Draw order: surface fill → every tile with its LUT colour (`fillStyle` only set when it changes) → one cached "glass" layer composited with `soft-light` (white over black stays black, so gaps and dark tiles are untouched) → one radial gradient at the halo with `lighter` for the bloom.

The loop stops itself when nothing moves: no pointer, no remaining decay, no flicker, and `idle="none"`. An `IntersectionObserver` pauses it off-screen; a `ResizeObserver` rebuilds the grid on size changes.

## Reduced motion

With `prefers-reduced-motion: reduce` there is no animation loop at all. The field is painted once at mount (halo parked at the drift origin when `idle="drift"`), every `pointermove` repaints instantly at the pointer, and `pointerleave` repaints the idle frame. No drift, no flicker, no lag.

## Design decisions

- **Canvas 2D, not DOM tiles** — 1 200 tiles at 800×600 is one `fillRect` loop, not 1 200 elements with transitions.
- **Integer device-pixel grid** — tile and pitch are rounded after DPR scaling, so the 2 px gaps stay crisp at 1.5× and 2×. DPR is capped at 2.
- **Cached glass layer** over a CSS `mix-blend-mode` overlay — one `drawImage` per frame, pixel-aligned with the tiles, present in the static reduced-motion frame.
- **Seed keyed by tile coordinates** — resizing the container keeps every visible tile's character.
- **No runtime dependencies.**

## Gotchas

- `color` and `background` must be hex (`#abc`, `#aabbcc`) or `rgb()`; named colours fall back to the defaults.
- Changing `tileSize`, `gap`, `seed`, `noise` or `ambient` rebuilds the grid and resets the trail.
- The host is `overflow-hidden`; popovers inside it will be clipped.
- On touch devices the halo follows while a finger is down and then fades; the idle drift takes over after 1.5 s.
