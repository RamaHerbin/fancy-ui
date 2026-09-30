# BorderBeam

A single comet of light riding a container's border. A white-hot head leads a long, feathered tail that fades from `colorFrom` to `colorTo` to nothing over a share of the perimeter (`tail`). The hairline underneath stays dim and only lights up within the comet's reach; a soft bloom sits on the edge and a faint spill of light falls just inside, so the light reads as being _on_ the edge rather than painted over it. Pure CSS: no JS animation loop, no SVG.

## Usage

```svelte
<script lang="ts">
	import { BorderBeam } from "fancy-ui-svelte";
</script>

<div class="relative overflow-hidden rounded-xl border p-6">
	<p>Content goes here</p>
	<BorderBeam />
</div>
```

Place it as the last child of a `position: relative` container (usually with `overflow: hidden`, which keeps the outer half of the bloom inside the card). It inherits the container's `border-radius`.

Several beams can share a container. `delay` puts a comet that many seconds behind the others (it runs from the first frame, it does not wait), and `reverse` sends it the other way — two comets half a lap apart, one reversed, pass each other twice per lap:

```svelte
<BorderBeam duration={10} />
<BorderBeam duration={10} delay={5} reverse colorFrom="#fcd9a8" colorTo="#f472b6" />
```

## Props

| Prop          | Type      | Default     | Description                                                                                   |
| ------------- | --------- | ----------- | --------------------------------------------------------------------------------------------- |
| `size`        | `number`  | `200`       | Diameter of the pool of light around the comet's head, in pixels (also sizes the inner spill) |
| `duration`    | `number`  | `9`         | Time for one full lap, in seconds                                                             |
| `borderWidth` | `number`  | `1.5`       | Thickness of the lit hairline, in pixels                                                      |
| `anchor`      | `number`  | `90`        | Where the comet starts, as a percentage of the perimeter clockwise from the top-left (0–100)  |
| `colorFrom`   | `string`  | `"#8ec5ff"` | Colour of the head and the start of the tail                                                  |
| `colorTo`     | `string`  | `"#c084fc"` | Colour the tail fades into                                                                    |
| `delay`       | `number`  | `0`         | Seconds behind the start position; the comet is already running on the first frame            |
| `tail`        | `number`  | `0.25`      | Length of the tail as a share of the perimeter (0–1)                                          |
| `glow`        | `number`  | `0.6`       | Strength of the bloom, the halo and the inner spill (0–1; `0` leaves only the crisp line)     |
| `reverse`     | `boolean` | `false`     | Travel counter-clockwise                                                                      |
| `class`       | `string`  | —           | Additional CSS classes on the root                                                            |

### Theming through CSS variables

Every prop is also written as a CSS variable in the root's inline `style` (`--border-beam-size`, `--border-beam-duration`, `--border-beam-color-from`, `--border-beam-color-to`, `--border-beam-tail`, `--border-beam-glow`, …). Because they are inline, a class cannot override them: set them through the props. `delay` and `anchor` are also turned into a phase in script (`--border-beam-offset`, `--border-beam-park`), so they only take effect through the props. One extra variable has no prop and can be set from CSS (on the root, or inherited from the container):

- `--border-beam-radius` (default `12px`) — the corner radius of the path, used only by browsers that cannot trace the box's own rounded edge (see below).

## How it is built

- **Riders.** Everything that moves is a small absolutely-positioned element on the border's own shape (`offset-path: border-box`, with `rect(0 auto auto 0 round var(--border-beam-radius))` as a fallback), rotated along the path (`offset-rotate: auto`) and driven by one `@keyframes` on `offset-distance`.
- **The tail bends around corners.** Instead of one long straight bar, the tail is 18 short overlapping gradient pieces, each running the same lap a little later than the one ahead of it (a negative `animation-delay` proportional to its place in the tail). Each piece blends from `colorFrom` to `colorTo` by its position and fades with an eased curve. Their length comes from the container's perimeter, read with container query units (`2 × (100cqw + 100cqh)`), so `tail` is a true share of the border at any size — no measuring in JS.
- **Layers**, bottom to top: an inner spill (a wide, faint radial pool, clipped to the inside); the bloom (8 thicker, tapering pieces plus a head blob, `blur(11px)`); a tight halo (8 thin pieces, `blur(2.5px)`); the hairline ring (masked to `borderWidth` with `mask-composite: exclude`) holding a near-invisible rail, the reach (a radial pool that lights the hairline around the head), the 18 tail pieces and the head (a short gradient ending white-hot); and finally the spark, a tiny white-hot point sitting on the edge.
- **Themes.** In dark mode the head burns white (`color-mix(in oklab, colorFrom 40%, white)`) and the bloom is at full strength. In light mode the inks are deepened a little so the pastel pair still reads on a pale surface, the head is a saturated core instead of white, and the bloom and spill are quieter.
- **Delay as a phase.** `delay` is turned into a negative `animation-delay` (`-(duration − delay mod duration)`), so a stacked comet is spread out along the border from the first frame instead of sitting frozen for `delay` seconds.
- The whole beam fades in over 600 ms on mount.

## Reduced motion

With `prefers-reduced-motion: reduce` nothing travels and nothing fades in: the comet is parked at `anchor` (shifted back by `delay`, so stacked comets stay apart), its tail laid out behind it and glowing softly — the same composition as a still frame of the animation.

## Accessibility

The root and every layer are decorative: the root carries `aria-hidden="true"` and `pointer-events: none`.
