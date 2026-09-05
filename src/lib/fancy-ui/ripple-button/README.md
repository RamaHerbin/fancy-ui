# RippleButton

A button that spawns a Material-style expanding ripple circle from the exact click position on every click, layered behind the button's content.

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
| `rippleColor` | `string`  | `"#ADD8E6"` | Color of the ripple effect                                           |
| `duration`    | `number`  | `600`       | Animation duration in milliseconds                                   |
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
- Ripple size is `Math.max(width, height)` of the button so a single circle always covers the whole button regardless of click position; position is computed from `event.clientX/Y` relative to the button's `getBoundingClientRect()`, centered on the click point.
- Each ripple is tracked in a `ripples` array keyed by `Date.now()` and removed via `setTimeout(duration)` after the animation finishes — rapid repeated clicks stack multiple concurrent ripple elements rather than restarting a single one.
- `duration` is threaded into the CSS animation via the `--ripple-duration` custom property, so the visual animation and the removal timeout always stay in sync even when `duration` changes between renders.
- No `prefers-reduced-motion` handling — the ripple scale/opacity animation plays on every click regardless of user preference.
