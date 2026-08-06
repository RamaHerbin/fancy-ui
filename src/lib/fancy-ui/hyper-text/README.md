# HyperText

Character scramble effect. Displays text that scrambles through random uppercase characters on hover, then resolves back to the original text with staggered reveal.

## Props

| Prop            | Type      | Default  | Description                        |
| --------------- | --------- | -------- | ---------------------------------- |
| `text`          | `string`  | required | Text to display and scramble       |
| `duration`      | `number`  | `800`    | Total animation duration (ms)      |
| `animateOnLoad` | `boolean` | `false`  | Whether to animate on initial load |
| `class`         | `string`  | `''`     | Additional CSS classes             |

## Usage

```svelte
<HyperText text="Hover me!" />
<HyperText text="Auto animate" animateOnLoad />
```
