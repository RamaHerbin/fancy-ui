# PulseBeam

Breathing border glow that wraps any card or control. Colour blobs drift along the
edges as a crisp 1px ring, a feathered inner glow and a blurred bloom; hues rotate
slowly; the whole thing fades in and out on `active`.

```svelte
<PulseBeam active={working} radius={20}>
	<div class="bg-card rounded-[20px] p-4">Working…</div>
</PulseBeam>
```

## Anatomy

```
.pulse-beam            position:relative; isolation:isolate; overflow:hidden (inner) / visible (outside)
├── {children}
├── .pulse-beam__glow   z:1  blobs + 4 corner dots, 28px inner feather mask
├── .pulse-beam__stroke z:2  blobs, padding:1px + content-box/border-box mask → 1px ring
└── .pulse-beam__bloom  z:3  static blobs, same ring mask, blur(8px) (blur runs before the mask)
```

`variant="outside"` moves glow and bloom to `z:-1`, `inset:-10px / -30px`, removes the
masks and blurs them harder (3px / 22.5px) — a halo behind the content. Blob sizes
scale with the box (`--pb-sx`, `--pb-sy`) through a ResizeObserver.

Files: `pulse-beam-data.ts` (palettes, blob tables, presets, oscillators, background
builders — pure), `pulse-beam-loop.ts` (one shared rAF for every instance),
`PulseBeam.svelte`.

## How it animates

A module-level `requestAnimationFrame` loop (throttled to ~30fps) writes 17 custom
properties on each active host — shape scales `--pb-bw{1,2,3}` / `--pb-bh{1,2,3}`,
drifts `--pb-bx*` / `--pb-by*`, a global height scale `--pb-gh`, four corner alphas
`--pb-op-{tl,tr,bl,br}` — plus `--pb-hue`. Every value is a cosine between two bounds
with its own period, so the motion never repeats visibly. The gradient strings
reference those properties with fallbacks, so the static render (reduced motion,
before the first frame) is already correct.

Instances offscreen (256px margin) are skipped; when every instance is paused or
idle the loop stops rescheduling.

## Design decisions

- **Real divs, not pseudo-elements.** Each layer carries its own inline `background`
  (built in Svelte from the palette), is selectable in jsdom, and can take its own
  `transitionend`.
- **`style:` directives only on the host — never a `style` string.** Svelte rewrites
  `cssText` when a style string changes, which would wipe the properties the loop
  writes every frame. Directives update per key, so `strength` / `radius` changes
  leave the loop's values alone. A consumer `style="…"` that changes at runtime will
  drop them for at most one frame.
- **Fade via `opacity` transitions, not `@property`.** The host flips
  `data-state="idle | active | fading"`; each layer's `opacity` is
  `calc(preset × var(--pb-strength))` and transitions to/from 0. A timer backs up
  `transitionend` for the cases where none fires (reduced motion, `display:none`
  ancestor, offscreen). `phase` starts `idle` even when `active` is true so the first
  activation is a real fade-in and SSR never flashes a lit ring.
- **Mono palette** halves every opacity and disables hue rotation (rotating greys is a
  wasted filter pass).

## Gotchas

- The child must paint an **opaque background with the same radius**. The host only
  clips in the inner variant; in the outside variant the halo sits behind the child.
- Inner variant is `overflow:hidden` — popovers or menus rendered inside the wrapped
  box get clipped. Use `variant="outside"` or a portal.
- `tone` is manual. The docs site toggles a `.dark` class, not `prefers-color-scheme`,
  so there is no reliable auto-detect; `tone="auto"` is a possible follow-up.
- `prefers-reduced-motion: reduce` → no loop, no transitions; the layers stay visible
  and static.
