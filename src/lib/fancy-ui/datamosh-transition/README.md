# DatamoshTransition

A page-transition overlay that looks like a corrupted video decode. A fixed grid of columns — narrow on the left, wide on the right — fills with flat blocks of saturated colour. Inside each column a stack of tiles falls along one curve: slivers at the top and bottom, one tile snapping open through the middle of the frame. `cover()` drops the columns over the page like a curtain, rightmost first; `reveal()` lets them fall away. Nothing ever moves horizontally.

## SvelteKit

Mount it once in the root layout and drive it from `onNavigate`:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { onNavigate } from "$app/navigation";
	import { DatamoshTransition } from "fancy-ui-svelte";

	let { children } = $props();
	let transition: ReturnType<typeof DatamoshTransition>;

	onNavigate(async (navigation) => {
		// Same-page hash jumps and the like don't need a transition.
		if (navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		await transition.cover();
		navigation.complete.then(() => transition.reveal());
	});
</script>

{@render children()}
<DatamoshTransition bind:this={transition} />
```

`onNavigate` waits for the returned promise, so the route swaps while the page is covered.

## API

| Method     | Returns         |                                            |
| ---------- | --------------- | ------------------------------------------ |
| `cover()`  | `Promise<void>` | Resolves once every column is down         |
| `reveal()` | `Promise<void>` | Resolves once every column has fallen away |
| `play()`   | `Promise<void>` | `cover()` then `reveal()`                  |

Calls interrupt each other: a `cover()` during a reveal pulls each column back up from wherever it is, and the superseded promise resolves at once. `phase` (bindable, read-only) and `data-state` on the overlay report `idle | covering | covered | revealing`.

The overlay is `position: fixed; inset: 0` (`contained` switches to `absolute` inside a positioned parent), `aria-hidden`, invisible and click-through while idle, and blocks clicks while it covers.

## Variants

Three independent knobs, all vertical-only:

| Prop      | Values                                                                      |                                                                                                                                                                          |
| --------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `variant` | `curtain` (default) · `rise` · `split` · `interlace`                        | Cover drops from the top / climbs from the bottom with the stacks rising / opens from the centre line and squeezes shut onto it / alternates curtain and rise per column |
| `sweep`   | `right` (default) · `left` · `center` · `edges` · `random`                  | Column order: from the right, from the left, out from the middle, in from both sides, seeded shuffle                                                                     |
| `colors`  | `broadcast` (default) · `sunset` · `thermal` · `mono` · `acid` · `string[]` | Palette preset or your own list. `DATAMOSH_PALETTES` is exported                                                                                                         |

```svelte
<DatamoshTransition bind:this={transition} variant="split" sweep="center" colors="thermal" />
```

Every variant is a pure remap of the same per-column band (`columnBand` in the core), so interruptions reverse the same way in all of them.

## Picture source

`source` swaps the palette for a picture: a URL (same-origin, CORS-enabled or a `data:` URL), an `<img>` or a `<canvas>`.

```svelte
<DatamoshTransition bind:this={transition} source="/cover.jpg" variant="split" sweep="center" />
```

The picture is fitted over the overlay like `object-fit: cover`, shrunk to a 96 px wide buffer, and sampled once per column (at its centre) and per slot (spread over the middle 60 % of its height, where the subject usually is). The table is auto-levelled (gain capped at ×1.6, so a dark picture is not blown out) and saturated, so a moody photo still decodes into flat, saturated blocks. Colours stay keyed by tile identity, as with the palette: each tile keeps its piece of the picture and drags it down as it falls.

Until the picture has loaded, and whenever it can't be read (a cross-origin image without CORS taints the canvas), the palette is used instead. Nothing throws.

To decode the page being left, snapshot it first. The Sunset example passes the picture URL when leaving golden hour, and bakes the CSS-filtered dusk into a small canvas when leaving dusk.

## How it animates

Pure math lives in `datamosh-transition-core.ts`:

- **Columns** — edge `i` sits at `W · (i/N)^power` (N = 11, power = 1.65). The non-uniform grid is what makes the mosaic read as receding perspective. It never changes while the overlay lives.
- **Fall** — tile boundaries come from one sigmoid `y = f(k)`, `k` = how far a tile has travelled. Steepness is tile height, so a tile enters as a sliver, opens to about half the height at the centre and squeezes shut on the way out. The tile count is odd (15) so one tile sits dead centre and takes the whole bulge. Past both ends the curve continues linearly with a shallow slope instead of clamping — clamping piles every off-screen tile onto `y = 0` and a strip flickers along the top edge.
- **No wrap** — the phase runs unbounded and tile identity derives from it (`id = -floor(flow) + n`). Wrapping would teleport every boundary back to the top once per cycle.
- **Spring** — the fraction of each tile step is re-timed through a mirrored exponential arrival: the tile rushes toward the middle of its step, hangs there while it is fattest, then releases. Monotonic and exact at 0 and 1, so the stack never drifts off schedule.
- **Zig-zag** — each column's phase is offset by −0.4 tile, so stacks ride higher to the right and interlock into a diagonal.
- **Colours** — indexed by tile identity, never screen position, so they don't swipe as the geometry slides. Every column reads the same cyclic strip with a one-step skew, so one colour spans the frame as a leaning row. The lightest colour and the one or two darkest recur often; without them the result is flat mid-tone corduroy.
- **Layers** — each tile is drawn a few px past its bottom edge and painted bottom-up, so the overhang laps over the tile below.
- **Coverage** — each column owns a band `[top, bot]`. Cover pushes `bot` to 1, reveal pushes `top` onto `bot`, at a fixed rate after a right-to-left stagger. Per-column and monotonic, so interruptions reverse cleanly.

Canvas 2D `fillRect` only, one time-based rAF loop (same pace at 60 and 120 Hz), DPR capped at 2. The loop runs only while the overlay is on screen; a hidden tab finishes the current phase at once so an awaiting navigation never hangs. Under `prefers-reduced-motion` covers and reveals are instant and the covered frame is a single still.
