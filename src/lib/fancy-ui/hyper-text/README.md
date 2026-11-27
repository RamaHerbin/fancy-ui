# HyperText

Character scramble effect. Displays text that scrambles through random uppercase characters on hover, then resolves back to the original text with staggered reveal.

## Props

| Prop            | Type      | Default | Description                        |
| --------------- | --------- | ------- | ---------------------------------- |
| `text`          | `string`  | required| Text to display and scramble       |
| `duration`      | `number`  | `800`   | Total animation duration (ms)      |
| `animateOnLoad` | `boolean` | `false` | Whether to animate on initial load |
| `class`         | `string`  | `''`    | Additional CSS classes             |

## Usage

```svelte
<HyperText text="Hover me!" />
<HyperText text="Auto animate" animateOnLoad />
```

## Reduced motion

With `prefers-reduced-motion: reduce` the text is shown whole and never scrambled, on load and on hover, and the characters do not fade in one after another. The preference is read each time the effect would start, so changing it takes effect on the next hover.
