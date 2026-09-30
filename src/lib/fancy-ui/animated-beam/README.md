# AnimatedBeam

## Overview

A fibre-optic connector between two elements. The link is drawn as a glass fibre (a translucent core inside a faint rim, with a hair of glint down the middle) that reads as a physical cable even at rest. Light travels along it as a packet: a white-hot head followed by three chromatic sub-pulses (start colour, a mix of both, stop colour), each longer, dimmer and further behind than the one before, so the tail visibly spreads out as it travels, like light through glass. Every layer sits over a soft blurred copy of itself. When the head lands, a halo swells behind the destination element and a single ripple leaves it.

## The look

- **Fibre**: theme-aware by default (`rgba(0,0,0,.18)` core on light surfaces, `rgba(255,255,255,.14)` on dark), themable through `--beam-fibre`, `--beam-fibre-rim` and `--beam-fibre-glint`. Passing `pathColor` switches back to a plain line in that colour at `pathOpacity` (0.2 by default), as before.
- **Packet**: glides out, settles into the destination at 78% of the cycle, then drains its tail into the node. The head's core is the start colour mixed with white (more white on dark surfaces, more colour on light ones so it never disappears).
- **Bloom**: a blurred disc in the stop colour sized from the destination element, plus a thin ripple ring. Its strength follows `glow`.
- `pulses` puts several packets in flight, spaced evenly over one cycle.
- The default `duration` comes from `seed` (between 4 and 7 seconds), so the server render and the browser agree; ids come from the component instance, never from `Math.random()`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `containerRef` | `HTMLElement` | required | Element that holds both endpoints; the SVG covers it. |
| `fromRef` | `HTMLElement` | required | Source element. |
| `toRef` | `HTMLElement` | required | Destination element. |
| `curvature` | `number` | `0` | Vertical bend in px (positive bows upward). |
| `reverse` | `boolean` | `false` | Light travels from `toRef` to `fromRef`; the bloom lands on `fromRef`. |
| `pathColor` | `string` | theme glass | Plain fibre colour. Unset keeps the theme-aware glass. |
| `pathWidth` | `number` | `2` | Width of the fibre core and of the packet. |
| `pathOpacity` | `number` | `1` (glass) / `0.2` (with `pathColor`) | Fibre opacity. |
| `gradientStartColor` | `string` | `#FFAA40` | Packet head colour (its core is this mixed with white). |
| `gradientStopColor` | `string` | `#9C40FF` | Far end of the tail and colour of the bloom. |
| `delay` | `number` | `0` | Seconds before the first packet leaves. |
| `duration` | `number` | from `seed` | Seconds per packet cycle. |
| `startXOffset` / `startYOffset` / `endXOffset` / `endYOffset` | `number` | `0` | Nudge either end in px. |
| `pulses` | `number` | `1` | Packets in flight at once (1–12), spaced evenly. |
| `tail` | `number` | `0.35` | Tail length as a fraction of the fibre (0.05–0.9). |
| `glow` | `number` | `0.6` | Strength of the blurred glow and the arrival bloom (0–1). |
| `seed` | `number` | `1` | Seed for the default `duration`. |
| `class` | `string` | `""` | Extra classes on the SVG. |

## Reduced motion

With `prefers-reduced-motion: reduce` there are no packets and no bloom. The fibre instead holds a still, soft gradient along its length (white-hot at the launch end, through the start and mixed colours, to the stop colour at the landing end), over a faint blurred copy, so the direction of the connection still reads.

## Notes

- The whole SVG is `aria-hidden="true"` and `pointer-events-none`; put the meaning in the connected elements.
- Give the connected elements a higher `z-index` than the beam (for example `relative z-10`) so the fibre ends and the bloom sit behind them.
- Horizontal, vertical and diagonal links all work: the packet follows the path itself.
