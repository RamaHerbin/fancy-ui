# SmoothCursor

A multiplayer-style cursor. An upright, coloured arrowhead with a crisp white rim follows the pointer on a spring, and an optional name pill trails it on its own, softer spring, so it lags a few frames behind and then settles into place. When the pointer rests, the pill dims until the next movement.

## The look

- **Arrow**: a tail-less arrowhead filled with `color`. The fill runs from a white-hot tint at the tip (`color` mixed 45% with white) to a slightly deeper shade at the base. A 1.5px white rim keeps it readable on light and dark surfaces. Under it sit a tight dark drop shadow and a soft glow in the cursor's own colour.
- **Name pill**: set `label` and a 22px pill appears at the arrow's lower right. It is filled with `color` and has white 12px medium text, a 1px white ring and a small top-left corner that points back at the tip. The pill follows the arrow on a softer spring, stays within 24px of it, and tilts by at most 5° with its sideways speed. After `idleFade` ms at rest, it fades to 35% opacity.
- **Upright by default**: the arrow's hotspot is its tip. `rotate` brings back the older behaviour: the cursor turns toward its direction of travel and pivots around its centre.

## Usage

```svelte
<script>
	import { SmoothCursor } from "fancy-ui-svelte";
</script>

<SmoothCursor label="You" />
<SmoothCursor label="Mara" color="#7c6cf2" idleFade={2500} />
```

The cursor covers the whole page. To limit it to one area, render it only while the pointer is inside that area (see the docs examples).

## Props

| Prop           | Type                                               | Default     | Description                                                                                       |
| -------------- | -------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `label`        | `string`                                           | —           | Name shown in the pill that trails the arrow. No pill when omitted.                               |
| `color`        | `string`                                           | `"#0e9f6e"` | Fill of the arrow and the pill (any CSS colour).                                                  |
| `rotate`       | `boolean`                                          | `false`     | Rotate the cursor toward its direction of travel.                                                 |
| `idleFade`     | `number`                                           | `1500`      | Milliseconds without movement before the pill dims. `0` disables it.                              |
| `springConfig` | `SpringConfig` (`{ damping?, stiffness?, mass? }`) | `{}`        | Arrow spring. Defaults: damping 45, stiffness 400, mass 1.                                        |
| `labelSpring`  | `SpringConfig`                                     | derived     | Pill spring. Missing fields come from `springConfig`: stiffness × 0.55, damping × 1.1, same mass. |
| `cursor`       | `Snippet`                                          | —           | Replaces the default arrow. The pill still renders when `label` is set.                           |
| `class`        | `string`                                           | `""`        | Classes for the fixed root layer.                                                                 |

## Theming

| CSS variable                  | Default          | Effect                                            |
| ----------------------------- | ---------------- | ------------------------------------------------- |
| `--smooth-cursor-color`       | the `color` prop | Overrides the arrow and pill colour from a class. |
| `--smooth-cursor-label-color` | `#fff`           | Text colour inside the pill.                      |

Set these variables on the component's `class`.

## Reduced motion

With `prefers-reduced-motion: reduce`, the arrow and the pill snap straight to the pointer. There is no spring, no trailing and no tilt. The idle dim still applies, but it switches instantly with no fade. If the setting changes while the page is open, the engine stops its loop and snaps both elements at once.

## Implementation notes

- The engine is framework-free and lives in `smooth-cursor-core.ts`. It owns the rAF loop, both springs, the label leash and tilt, the idle timer, the `document` pointer listeners, and hiding and restoring the native cursor. The wrapper owns the markup, the snippet, `class` and the reduced-motion query.
- The loop sleeps once both springs settle on the pointer and wakes on the next move. The first frame after it wakes integrates at most one 60 Hz step.
- The whole layer is `aria-hidden` and `pointer-events: none`. The pill is plain text inside that layer.
