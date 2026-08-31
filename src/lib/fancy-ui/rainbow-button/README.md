# RainbowButton

A button (or anchor, when `href` is set) with an animated rainbow gradient border and a matching blurred glow beneath it, built entirely from CSS gradients, background layering, and a single `background-position` keyframe animation.

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

| Prop       | Type                                                        | Default    | Description                                                          |
| ---------- | ----------------------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `speed`    | `number`                                                    | `2`        | Animation speed in seconds (lower = faster)                          |
| `href`     | `string`                                                    | —          | Renders an `<a>` instead of a `<button>` when set                    |
| `type`     | `"button" \| "submit" \| "reset"`                           | `"button"` | Native `<button>` `type` attribute (ignored when `href` is set)      |
| `disabled` | `boolean`                                                   | —          | Disables the button / marks the link `aria-disabled`                 |
| `ref`      | `HTMLButtonElement \| HTMLAnchorElement \| null` (bindable) | `null`     | Bound reference to the rendered element                              |
| `class`    | `string`                                                    | —          | Additional CSS classes                                               |
| `children` | `Snippet`                                                   | —          | Button label content                                                 |
| `sound`    | `boolean`                                                   | `false`    | Plays the `press` cue on activation, once the user has enabled sound |

## Sound

Set `sound` to play the `press` cue on activation, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<RainbowButton sound onclick={() => go()}>Get started</RainbowButton>

<!-- Works identically on the anchor branch -->
<RainbowButton sound href="/pricing">See pricing</RainbowButton>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). `disabled` blocks the cue on both the button and the anchor branch, even though the anchor has no native `disabled` attribute to rely on. Since this component has no `...restProps` spread (see the note above), no consumer `onclick` is forwarded from the cue's own handler — that behaviour is unchanged.

## Implementation notes

- `RainbowButtonProps` is typed as `BaseProps & Omit<HTMLButtonAttributes, ...> & Omit<HTMLAnchorAttributes, ...>` for editor completion, but the component only actually reads `class`, `speed`, `href`, `type`, `disabled`, `ref`, and `children` off `$props()` — there is no `...restProps` spread, so other native attributes typed as valid (e.g. `onclick` via `HTMLButtonAttributes`) are **not** forwarded to the rendered element. Attach event listeners with `onclick` on a wrapping element, or extend the component, if pass-through is needed beyond what's listed above.
- When `href` is set, the rendered `<a>` gets `aria-disabled` and `tabindex="-1"` (plus `role="link"`) instead of a native `disabled` attribute, since anchors don't support `disabled`.
- The rainbow gradient colors (`--rainbow-1`…`--rainbow-5`) are hard-coded HSL custom properties scoped to `.rainbow-button` in the component's own `<style>` block — they aren't exposed as props; only the shared `speed` (as `--rainbow-speed`) is.
- Light/dark mode swap the button's own fill and text color (dark button + white text in light mode, light button + black text in `dark:`) while reusing the same rainbow gradient for both the border and the glow.
- No `prefers-reduced-motion` handling — the border and glow animation run continuously regardless of user preference.
