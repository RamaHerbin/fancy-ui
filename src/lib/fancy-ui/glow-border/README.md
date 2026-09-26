# GlowBorder

A liquid-metal ring for a container's edge. Iridescent reflections flow along a dark chrome border, a glint rides around it, and the glint spills a soft glow on both sides of the edge. Pure CSS: no canvas, no WebGL, cheap enough to put on every card of a grid.

## Usage

```svelte
<script>
	import { GlowBorder } from "fancy-ui-svelte";
</script>

<div class="bg-card relative rounded-xl p-6">
	<p>Content goes here</p>
	<GlowBorder />
</div>
```

The parent needs `position: relative` (the ring is an `absolute inset-0` overlay) and a border radius, which the ring inherits.

## Props

| Prop           | Type                                | Default       | Description                                                                    |
| -------------- | ----------------------------------- | ------------- | ------------------------------------------------------------------------------ |
| `preset`       | `"chromatic" \| "silver" \| "gold"` | `"chromatic"` | Metal palette: iridescent chrome, cool steel or warm gold                      |
| `color`        | `string \| string[]`                | —             | Custom tints for the reflections, woven with neutral metal; overrides `preset` |
| `strength`     | `number`                            | `0.8`         | Intensity of the glint and its glow, 0–1                                       |
| `borderRadius` | `number`                            | `10`          | Border radius in pixels                                                        |
| `borderWidth`  | `number`                            | `1.5`         | Width of the metal ring in pixels                                              |
| `duration`     | `number`                            | `10`          | One flow cycle of the metal, in seconds; the glint laps in 0.4× that           |
| `class`        | `string`                            | `""`          | Additional classes on the overlay                                              |

## Examples

```svelte
<GlowBorder preset="gold" />
<GlowBorder color={["#3b82f6", "#8b5cf6", "#ec4899"]} strength={1} />
<GlowBorder borderWidth={2} duration={6} />
```

## How it works

- **Liquid metal** (`.glow-border__metal`): two conic gradients built by `metalField()`, centred at different points (30% 40% and 72% 65%) and turned by two registered angles, `--gb-a1` over `duration` and `--gb-a2` over 1.7 × `duration` in reverse, blended with `soft-light`. Each field is mostly shadow with one sharp reflection per tint; where the two fields cross, the reflections appear, swell and dissolve instead of simply spinning. Masked to a `borderWidth` ring (`mask` content-box + `mask-composite: exclude`).
- **Glint** (`.glow-border__glint`): a short bright arc turned by `--gb-a3` (0.4 × `duration` per lap), on the same ring, with `mix-blend-mode: screen` so it lights the metal it passes over.
- **Halo** (`.glow-border__halo`): the glint on a wider ring, blurred by its parent wrapper so the blur applies after the mask and falls off softly on both sides of the edge.
- **Themes**: every palette has a dark and a light version, both passed as CSS variables; `.dark` on an ancestor switches to the bright one. Light pages get deeper tones and a fainter halo, so the metal still reads on white.
- `prefers-reduced-motion`: nothing turns; the metal and the glint rest at fixed angles.
