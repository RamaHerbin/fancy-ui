# Typing Indicator

An animated three-dot presence indicator for chat surfaces, tuned to stay legible without pulling the eye away from the conversation.

## Components

- `TypingIndicator` - Three dots animated as a single wave, wrapped in a polite live region

## Usage

```svelte
<script>
	import { TypingIndicator } from "fancy-ui-svelte";
</script>

<div class="bg-muted inline-flex rounded-2xl px-4 py-3">
	<TypingIndicator label="Assistant is typing" />
</div>
```

## Props

| Prop    | Type                     | Default                                  | Description                                            |
| ------- | ------------------------ | ---------------------------------------- | ------------------------------------------------------ |
| `size`  | `number`                 | `6`                                      | Dot diameter in pixels                                 |
| `color` | `string`                 | `'var(--ft-typing-color, currentColor)'` | Dot color; any CSS color or custom property expression |
| `speed` | `number`                 | `1.2`                                    | Duration of one full animation cycle in seconds        |
| `label` | `string`                 | `'Typing'`                               | Visually hidden text announced to assistive technology |
| `class` | `string`                 | `undefined`                              | Additional CSS classes                                 |
| `ref`   | `HTMLDivElement \| null` | `null`                                   | Bindable element reference                             |

## Theming

The default `color` resolves `--ft-typing-color` and falls back to `currentColor`, so the dots inherit the text color of whatever bubble they sit in. Set the custom property on an ancestor to theme every indicator at once:

```css
.chat-thread {
	--ft-typing-color: var(--color-muted-foreground);
}
```

## Implementation Notes

- Pure CSS animation, no timers and no measurement, so it renders identically on the server and in the browser.
- The three dots share one keyframe track and are offset by a sixth of the cycle each (`0`, `speed / 6`, `speed / 3`). The wave peaks at `translateY(-25%)` of the dot's own height — roughly 1.5px at the default size — which reads as breathing rather than bouncing.
- The wave lives entirely inside `@media (prefers-reduced-motion: no-preference)`. When motion is reduced there is no animation to override: the dots simply hold their `0.5` base opacity, so the indicator still communicates presence while static.
- The root is a `role="status"` `aria-live="polite"` region containing an `sr-only` label; the dots themselves are `aria-hidden`. Mount the component when typing starts and unmount it when it stops — that transition is what screen readers announce.
- Dot size and the gap between dots both derive from `size` via inline custom properties, so the gap is not overridable through `class`. Adjust `size` instead.
- A `speed` of zero or less is clamped to `0.01s`; a non-positive `animation-duration` would invalidate the declaration and freeze the dots mid-cycle.
