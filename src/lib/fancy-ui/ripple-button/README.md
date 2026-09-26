# RippleButton

A button that answers every click with a ripple of light from the exact click point: a soft glow that blooms and fades, and two fine rings spreading out a beat apart, like a wave on water. While it runs, the border takes the ripple's tint. A keyboard press ripples from the centre. On hover, the button reacts like a fingertip over water: a soft glow in `rippleColor` follows the pointer, and a faint ring keeps pulsing out from it.

## Usage

```svelte
<script lang="ts">
	import { RippleButton } from "fancy-ui-svelte";
</script>

<RippleButton onclick={() => console.log("clicked")}>Click me</RippleButton>

<RippleButton rippleColor="#f472b6" duration={800} class="bg-primary text-primary-foreground">
	Custom ripple
</RippleButton>
```

## Props

| Prop          | Type      | Default     | Description                                                          |
| ------------- | --------- | ----------- | -------------------------------------------------------------------- |
| `rippleColor` | `string`  | `"#60a5fa"` | Colour of the ripple: its glow, its rings and the border tint        |
| `duration`    | `number`  | `900`       | Animation duration in milliseconds                                   |
| `class`       | `string`  | —           | Additional CSS classes                                               |
| `children`    | `Snippet` | —           | Button content                                                       |
| `sound`       | `boolean` | `false`     | Plays the `press` cue on activation, once the user has enabled sound |

`RippleButtonProps` also extends `HTMLButtonAttributes` (minus `class`), and any attributes not explicitly listed above (e.g. `type`, `aria-*`, `data-*`) are spread onto the rendered `<button>` via `...restProps`.

## Sound

Set `sound` to play the `press` cue on activation, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<RippleButton sound onclick={() => console.log("clicked")}>Click me</RippleButton>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). `disabled` blocks the cue exactly like it blocks a native click. The cue plays once per click alongside the ripple; the ripple's own removal timeout never triggers a second cue.

## Implementation notes

- `onclick` is intercepted, not overwritten: the component's own `handleClick` always creates the ripple first, then calls the caller's `onclick` (if provided) with the original event — passing `onclick` works exactly as it would on a plain `<button>`.
- Geometry comes from `rippleGeometry(rect, event)` (exported from the component module): the centre is the pointer position, or the button's centre when `event.detail === 0` (Enter/Space), and the diameter is twice the distance to the farthest corner, so the rings always sweep the whole button.
- Each ripple is one `.ripple-animation` element: its background is the glow (a radial gradient of `rippleColor`), its `::before` and `::after` are the two rings, the second delayed by 12% of `duration`. All three scale from 0 to 1 on an ease-out curve while fading.
- `rippleColor` is exposed as `--ripple-color`; everything is tinted from it through `color-mix()`. `data-rippling` is set on the button while any ripple runs, and tints the border.
- Each ripple is tracked in a `ripples` array with a monotonic key and removed via `setTimeout(duration)` after the animation finishes — rapid repeated clicks stack concurrent ripples rather than restarting one.
- `duration` is threaded into the CSS animation via the `--ripple-duration` custom property, so the visual animation and the removal timeout always stay in sync.
- **Hover**: `pointermove` writes `--ripple-x` / `--ripple-y` on the button (no re-render; a consumer `onpointermove` is still called). `.ripple-hover` is a radial glow at that point, and its `::after` is a 72 px ring that pulses from it every 1.8 s while hovered. The border takes a lighter tint of `rippleColor` on hover.
- `prefers-reduced-motion`: no expansion and no rings, only a brief glow that fades where you pressed; on hover the glow follows the pointer but the ring does not pulse.
