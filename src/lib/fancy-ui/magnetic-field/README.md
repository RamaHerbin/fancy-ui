# MagneticField

A field in which every `MagneticItem` is pulled toward a magnet and leans
toward it, then springs back home when the magnet goes away. Light items jump,
heavy ones barely move, so a card full of chips, a heading, a paragraph and a
couple of buttons comes apart and settles back like loose pieces on a table.
The magnet is the pointer by default, a position you control, or a draggable,
keyboard-operable `MagnetPuck`.

## Installation

```sh
npm install fancy-ui-svelte
```

Set up Tailwind as the package README describes (`@import "fancy-ui-svelte/tailwind.css";`).
The component itself needs no stylesheet.

## Components

- `MagneticField` — the root. It owns the magnet, measures the items and runs
  one animation loop for all of them.
- `MagneticItem` — wraps one element that reacts. Its outer wrapper stays put
  and is the box the field measures; an inner wrapper carries the motion.
- `MagnetPuck` — an optional draggable magnet. Inside a field it drives the
  field while it is held; outside one it is a plain draggable whose `position`
  you can feed to a field yourself.

## Usage

```svelte
<script>
	import { MagneticField, MagneticItem, MagnetPuck } from "fancy-ui-svelte";
</script>

<MagneticField class="p-10">
	<MagneticItem mass={0.6}>
		<span class="bg-muted rounded-full px-3 py-1">Springs</span>
	</MagneticItem>
	<MagneticItem mass={1.2}>
		<h2 class="text-3xl font-bold">Pull, then let go</h2>
	</MagneticItem>
	<MagneticItem mass={3}>
		<p>Heavy blocks only lean.</p>
	</MagneticItem>

	<MagnetPuck position={{ x: 40, y: 40 }} />
</MagneticField>
```

Wrap each element that should move on its own in its own `MagneticItem`. Use
`inline` for items that sit in a row of text or a row of chips.

### A controlled magnet

`source="manual"` ignores the pointer and reads `position`, in px from the
top-left of the field's padding box. `null` means no magnet.

```svelte
<script>
	import { MagneticField, MagneticItem } from "fancy-ui-svelte";

	let magnet = $state(null);
</script>

<MagneticField source="manual" position={magnet}>…</MagneticField>
```

### Repel

`polarity={-1}` pushes the items away instead. Only the travel flips; the
lean stays the same.

## How it moves

- **Falloff.** Pull is strongest when the magnet touches or overlaps an item
  and fades smoothly (a smoothstep) to nothing once the magnet is `radius` px
  beyond the item's nearest edge. Distance is measured from the edge, not the
  centre, so a wide paragraph reacts as soon as the magnet reaches any part of
  it.
- **Travel.** Each item moves toward the magnet by up to `maxTranslate` px,
  scaled by the field's `strength`, the item's `strength` and the falloff, and
  divided by its `mass`. Near the item's centre the pull fades out, so an item
  never jumps past the magnet and never jitters under a resting pointer.
- **Lean.** Items lean toward the magnet's side like a crowd turning its head:
  clockwise when the magnet is to their left, counter-clockwise when it is to
  their right, up to `maxRotate` degrees. The lean reaches twice as far as the
  travel, so even items that barely move still turn. This is the behaviour we
  measured on a physical-magnet reference, where the lean follows the
  horizontal side of the magnet even when it is level with or below an item.
- **Mass.** A heavier item travels and leans less (the target is divided by
  `mass`) and settles more slowly, with the same damping ratio, so heavy items
  are slower but never bouncier. Mass is clamped to 0.25–10.
- **Springs.** `"default"` is near-critical (stiffness 230, damping 30): no
  visible overshoot, settled in about a third of a second. `"soft"`
  (170 / 18) overshoots a little; `"snappy"` (320 / 36) is quicker. The lean
  uses a stiffer spring than the travel, so items turn first and then move.
  Changing any prop mid-flight keeps the current speed.
- **Rigid blocks.** Every item moves as one transform from its centre: no
  scaling, no fading, no per-line or per-letter motion.

## The magnet

There are three channels, and the first one that holds a point wins:
**puck > manual > pointer**.

- **Pointer** (`source="pointer"`, the default): a mouse or pen anywhere on the
  page, as long as it is within `radius` of an item. Touch is ignored: a finger
  on the screen would hide what it pulls. Leaving the page, switching window or
  hiding the tab lets the items go. A pointer over a `MagnetPuck` (hovering it
  or dragging it) feeds nothing, so letting go of the puck releases the items
  even though the cursor is still there; the pointer takes over again once it
  moves off the puck.
- **Manual** (`source="manual"`): the `position` prop.
- **Puck**: a `MagnetPuck` inside the field, while it is held (or always, with
  `sticky`). Use one puck per field: pucks share one channel.

### MagnetPuck keyboard

The puck is a button in the tab order with a visible focus ring.

| Key           | Action                                  |
| ------------- | --------------------------------------- |
| Space / Enter | Pick the puck up, or put it down        |
| Arrow keys    | Move 8 px (32 px with Shift)            |
| Escape        | Put it down                             |
| Tab away      | Puts down a puck held from the keyboard |

Arrows on a puck that is not held move it without attracting anything (unless
it is `sticky`), so you can place it first and then pick it up. `aria-pressed`
reflects whether it is held. The puck is described by a built-in, visually
hidden hint ("Space or Enter picks it up and puts it down; the arrow keys move
it."), so screen-reader users hear the keys after its name; pass your own
`aria-describedby` to replace it.

## Props

### MagneticField

| Prop             | Type                                                         | Default     | Description                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `source`         | `"pointer" \| "manual"`                                      | `"pointer"` | Where the magnet comes from. `"pointer"` follows a mouse or pen within `radius` of an item (touch is ignored); `"manual"` reads `position`. A held `MagnetPuck` wins in either mode. |
| `position`       | `MagneticPoint \| null`                                      | `null`      | The magnet in px, relative to the field's padding box, used when `source` is `"manual"`. `null` means no magnet.                                                                     |
| `radius`         | `number`                                                     | `220`       | Falloff distance from each item's nearest edge, in px. Beyond it an item no longer moves; it can still lean, up to twice as far.                                                     |
| `strength`       | `number`                                                     | `1`         | Global pull multiplier, on top of each item's `strength`. `0` turns the effect off without detaching anything.                                                                       |
| `maxTranslate`   | `number`                                                     | `24`        | Largest distance, in px, that any item travels toward the magnet.                                                                                                                    |
| `maxRotate`      | `number`                                                     | `6`         | Largest lean, in degrees: clockwise when the magnet is to an item's left, counter-clockwise when it is to its right.                                                                 |
| `spring`         | `"soft" \| "default" \| "snappy" \| Partial<MagneticSpring>` | `"default"` | How items move and settle. Missing keys of a custom `{ stiffness, damping, mass }` come from `"default"`.                                                                            |
| `polarity`       | `1 \| -1`                                                    | `1`         | `1` attracts, `-1` repels. Only travel flips; the lean stays the same.                                                                                                               |
| `disabled`       | `boolean`                                                    | `false`     | Detaches every listener and springs each item back to rest.                                                                                                                          |
| `onActiveChange` | `(active: boolean) => void`                                  | —           | Called when the field wakes up (a magnet is engaged or an item is still settling) and when it goes back to sleep.                                                                    |
| `children`       | `Snippet`                                                    | —           | The content. Wrap each element that should react in a `MagneticItem`.                                                                                                                |
| `class`          | `string`                                                     | —           | Additional CSS classes on the root.                                                                                                                                                  |
| `ref`            | `HTMLDivElement \| null`                                     | `null`      | Bindable reference to the root.                                                                                                                                                      |

Native `<div>` attributes and listeners are forwarded to the root.

### MagneticItem

| Prop       | Type                  | Default | Description                                                                            |
| ---------- | --------------------- | ------- | -------------------------------------------------------------------------------------- |
| `mass`     | `number`              | `1`     | Above 1 the item moves and leans less and settles more slowly; below 1 it is livelier. |
| `strength` | `number`              | `1`     | Per-item pull multiplier, on top of the field's `strength`.                            |
| `pull`     | `boolean`             | `true`  | Whether the item moves toward the magnet.                                              |
| `rotate`   | `boolean`             | `true`  | Whether the item leans toward the magnet.                                              |
| `inline`   | `boolean`             | `false` | Renders `<span>` wrappers with `display: inline-block` instead of block `<div>`s.      |
| `children` | `Snippet`             | —       | The element that reacts.                                                               |
| `class`    | `string`              | —       | Additional CSS classes, on the static outer wrapper.                                   |
| `ref`      | `HTMLElement \| null` | `null`  | Bindable reference to the static outer wrapper.                                        |

Native attributes and listeners go to the outer wrapper. Outside a
`MagneticField` the item renders the same markup and never moves.

### MagnetPuck

| Prop               | Type                                | Default            | Description                                                                                                    |
| ------------------ | ----------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `position`         | `MagneticPoint`                     | `{ x: 48, y: 48 }` | The puck's centre in px, relative to its positioned parent (the field's padding box inside a field). Bindable. |
| `onPositionChange` | `(position: MagneticPoint) => void` | —                  | Called with each new position while the puck is dragged or moved with the keyboard.                            |
| `size`             | `number`                            | `40`               | Diameter in px.                                                                                                |
| `sticky`           | `boolean`                           | `false`            | Keeps attracting once released. By default it attracts only while held.                                        |
| `label`            | `string`                            | `"Magnet"`         | Accessible name. A built-in hint naming the keys describes the puck; pass `aria-describedby` to replace it.    |
| `onHeldChange`     | `(held: boolean) => void`           | —                  | Called when the puck is picked up (pointer down, or Space/Enter) and put down.                                 |
| `children`         | `Snippet`                           | —                  | A custom face. Leave it out for the default matte black disc.                                                  |
| `class`            | `string`                            | —                  | Additional CSS classes.                                                                                        |
| `ref`              | `HTMLDivElement \| null`            | `null`             | Bindable reference to the puck.                                                                                |

The puck stays inside its parent's padding box while dragged. Its `role`,
`tabindex`, `aria-label`, `aria-pressed` and pointer and key handlers are the
component's; other native attributes are forwarded, and an `aria-describedby`
you pass replaces the built-in keyboard hint.

## Styling hooks

| Hook                                  | Where              | Meaning                                        |
| ------------------------------------- | ------------------ | ---------------------------------------------- |
| `.ft-magnetic-field`                  | root               | `position: relative`                           |
| `[data-source]`                       | root               | `pointer` or `manual`                          |
| `[data-active]`                       | root               | Present while the loop is awake                |
| `.ft-magnetic-item`                   | item outer wrapper | Never transformed; `[data-inline]` when inline |
| `.ft-magnetic-item-inner`             | item inner wrapper | Carries the transform                          |
| `--ft-mf-x`, `--ft-mf-y`, `--ft-mf-r` | item inner wrapper | Current travel (px) and lean (deg)             |
| `.ft-magnet-puck`, `[data-held]`      | puck               | `data-held` while it is held                   |

The variables are written by the field every frame it is awake, and rest at
`0.00px` / `0.00deg`. They are registered with `@property` as non-inherited
(`<length>`, `<length>`, `<angle>`), so a write restyles the inner wrapper
alone and not its whole subtree. Read them on `.ft-magnetic-item-inner`
itself, for example to add a shadow that grows as an item travels; your own
elements inside the item see `0`.

## Performance

- One `requestAnimationFrame` loop per field, started on demand and asleep as
  soon as every item is at rest and no magnet is engaged.
- Each frame reads every rect first, then writes; nothing forces a layout per
  item. Rects are re-read only after a resize, a scroll or a layout change.
- Motion is one 2D transform per item, written as non-inherited CSS
  variables: nothing re-renders in Svelte while items move, and a write
  restyles one node. `will-change` is set only while an item's springs are
  moving and dropped once it settles, even if the magnet stays put, so a
  resting field holds no compositor layers.
- A pointer moving far from every item (beyond twice `radius`) of a field at
  rest schedules no frame at all.
- The pointer listener is attached only while the field, grown by `radius`, is
  on screen.

## Accessibility

- The motion is decorative: the field adds no role and no ARIA, and your
  content, links and buttons stay exactly as written, focusable and clickable
  while they move.
- With `prefers-reduced-motion: reduce`, every item stays at rest and no frame
  is ever scheduled. The puck can still be dragged but pulls nothing.
- The puck is keyboard-operable (see above) with a visible focus ring.

## Limits and known gaps

- **No wall.** Items are not stopped at the field's edges and do not stack
  against each other; they can travel up to `maxTranslate` past the field or
  over a neighbour. Leave padding of at least `maxTranslate` around your
  content. A clipping parent (`overflow: hidden`) cuts the motion off, and an
  `overflow: auto` parent may show scrollbars while items move.
- **Overlap under the magnet.** Items do not avoid each other: tightly packed
  neighbours all head for the same point and can cover one another. Keep
  `maxTranslate` below the gap between small items (or below about 5 % of the
  field's width on narrow screens), and spread their masses so they fan out.
- **The inner wrapper is always transformed.** Even at rest it carries an
  identity transform, which makes it a stacking context and the containing
  block of any `position: fixed` descendant. A fixed tooltip, menu or popover
  inside a `MagneticItem` is then placed and clipped against the item: portal
  it out of the item, or wrap only its trigger.
- **No nested items.** A `MagneticItem` inside another one is not supported.
- **Transformed ancestors.** Inside a scaled or rotated container, distances
  are measured in screen px.
- **No touch pointer, no device orientation.** On touch screens use a
  `MagnetPuck` or a controlled `position`.
- **One puck per field.**

## Implementation notes

All the maths, the measurement and the spring stepping live in
`magnetic-field-core.ts`, and the pointer and layout listeners in
`magnetic-field-source.ts`. Both are framework-free and carried byte for byte
by the Svelte, React and Vue packages, so the three behave the same. Springs
are stepped in fixed 1/240 s substeps, so the motion is identical at 30, 60
or 120 frames per second.
