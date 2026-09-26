# NeonBorder

A two-colour neon tube around its content. A faint tube runs all the way round; two beams, one per colour, chase each other along it from opposite sides. Each beam has a white-hot core and a coloured glow that spills both inside and outside the edge. The tube flickers once as it ignites, then the glow hums with a slow breathing.

## Props

| Prop            | Type                         | Default     | Description                                                                                |
| --------------- | ---------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `color1`        | `string`                     | `'#0496ff'` | First neon colour                                                                          |
| `color2`        | `string`                     | `'#ff0a54'` | Second neon colour                                                                         |
| `animationType` | `'none' \| 'half' \| 'full'` | `'half'`    | `none`: two lit corners, static · `half`: two short beams chasing · `full`: two long beams |
| `duration`      | `number`                     | `6`         | Time for the beams to travel once around, in seconds                                       |
| `class`         | `string`                     | `''`        | Additional CSS classes                                                                     |

## Slots

- **default** — Content rendered inside the neon border

## Usage

```svelte
<NeonBorder color1="#0496ff" color2="#ff0a54" animationType="half">
	<div class="bg-background rounded-lg px-4 py-2 text-center">Neon content</div>
</NeonBorder>
```

Give the content its own background: the tube is the 1.5 px padding ring around it. Leave room around the component — the glow spills about 10 px past the edge and is no longer clipped.

## How it works

- Three `aria-hidden` layers sit over the content, all `pointer-events: none`, each masked to a ring (`mask` content-box + `mask-composite: exclude`):
  - `.neon-tube` — the unlit tube, a faint `color1 → color2` gradient all the way round;
  - `.neon-glow` — the beams on a ring ~13 px wide straddling the edge, blurred by its parent so the blur applies after the mask and spills softly both ways;
  - `.neon-core` — the beams again on the 1.5 px tube, each colour mixed 55% toward white: the white-hot centre.
- The beams are one conic gradient built by `neonBeams()` — each beam fades in from its tail and cuts off sharply at its head, the second half a turn behind the first — turned by a registered `--neon-angle` over `duration`. `half` beams cover 22% of the turn each, `full` beams 46%. `none` uses `neonCorners()` instead: the first colour lit top-left, the second bottom-right.
- On first paint the light layer flickers once (`neon-ignite`, 0.9 s), then the glow breathes between two opacities (`neon-hum`, 2.8 s). Light pages get a fainter glow; `.dark` switches to the full one.
- `prefers-reduced-motion`: no travel, flicker or hum — the beams rest where they are.
