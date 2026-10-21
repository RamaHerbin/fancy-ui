# RainbowButton

A button (or anchor, when `href` is set) with an animated rainbow gradient border and a matching blurred glow beneath it, built entirely from CSS gradients, background layering, and a single `background-position` keyframe animation. On hover or keyboard focus, a rainbow beam rides around the border with a soft halo outside the button.

## Usage

```svelte
<script lang="ts">
	import { RainbowButton } from "fancy-ui-svelte";
</script>

<RainbowButton onclick={() => console.log("clicked")}>Get started</RainbowButton>

<!-- Renders an <a> instead of a <button> -->
<RainbowButton href="/pricing" speed={3}>See pricing</RainbowButton>
```

## Props

| Prop       | Type                                                        | Default    | Description                                                                                                         |
| ---------- | ----------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `speed`    | `number`                                                    | `2`        | Animation speed in seconds (lower = faster)                                                                         |
| `href`     | `string`                                                    | —          | Renders an `<a>` instead of a `<button>` when set                                                                   |
| `type`     | `"button" \| "submit" \| "reset"`                           | `"button"` | Native `<button>` `type` attribute (ignored when `href` is set)                                                     |
| `disabled` | `boolean`                                                   | —          | Disables the button / marks the link `aria-disabled`                                                                |
| `ref`      | `HTMLButtonElement \| HTMLAnchorElement \| null` (bindable) | `null`     | Bound reference to the rendered element                                                                             |
| `class`    | `string`                                                    | —          | Additional CSS classes                                                                                              |
| `children` | `Snippet`                                                   | —          | Button label content                                                                                                |
| `onclick`  | `(event: MouseEvent) => void`                               | —          | Click handler, called once per activation (never while `disabled`)                                                  |
| `sound`    | `boolean`                                                   | `false`    | Plays the `hover` cue when a mouse or pen enters and the `press` cue on activation, once the user has enabled sound |

Any other native attribute (`aria-label`, `id`, `data-*`, `target`, …) is forwarded to the rendered `<a>` or `<button>`. A consumer `style` is appended after the component's own `--rainbow-speed`.

## Sound

Set `sound` to play the `press` cue on activation, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<RainbowButton sound onclick={() => go()}>Get started</RainbowButton>

<!-- Works identically on the anchor branch -->
<RainbowButton sound href="/pricing">See pricing</RainbowButton>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). `disabled` blocks the cue on both the button and the anchor branch, even though the anchor has no native `disabled` attribute to rely on.

## Implementation notes

- `RainbowButtonProps` is `BaseProps & Omit<HTMLButtonAttributes, ...> & Omit<HTMLAnchorAttributes, ...>`. `onclick` is pulled out of the rest props and called from the component's own `handleClick`, and everything else is spread on the rendered element, so the spread can never replace the click handler.
- Click order: if `disabled`, the event's default action is cancelled and neither the cue nor `onclick` runs. Otherwise the `press` cue plays (when `sound` is set), then `onclick` is called exactly once.
- When `href` and `disabled` are both set, the rendered `<a>` is inert: `href` and `target` are dropped, and it gets `aria-disabled`, `tabindex="-1"` and `role="link"`, since anchors don't support `disabled`. Clicking it is cancelled.
- The rainbow gradient colors (`--rainbow-1`…`--rainbow-5`) are hard-coded HSL custom properties scoped to `.rainbow-button` in the component's own `<style>` block — they aren't exposed as props; only the shared `speed` (as `--rainbow-speed`) is.
- Light/dark mode swap the button's own fill and text color (dark button + white text in light mode, light button + black text in `dark:`) while reusing the same rainbow gradient for both the border and the glow.
- **Hover beam.** Two `aria-hidden` spans carry it. `.rainbow-button__beam` is a conic gradient masked to a 1.5 px ring on the border (`mask: content-box exclude`). `.rainbow-button__glow` is the same gradient on a 6 px ring, blurred by its parent so the blur applies after the mask and both edges go soft; it sits outside the face, so the button's fill stays clean. The gradient turns through a registered `@property --beam-angle` (one lap = 1.5 × `speed`), and only while hovered or focused (`:focus-visible`). Both layers fade in over 350 ms.
- Under `prefers-reduced-motion` the beam still fades in on hover, but frozen at one angle. The resting border and glow animation (`background-position`) keep running regardless of the preference, as before.
