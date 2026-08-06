# LineReveal

Reveals text line by line with a staggered slide-up animation.

Unlike DOM-splitting approaches, line breaks are computed with
[@chenglou/pretext](https://github.com/chenglou/pretext) — canvas-accurate text
measurement in pure JS. Each computed line is rendered as its own masked
element, so the per-line stagger works without measuring or mutating the DOM,
and lines re-wrap instantly on container resize.

## Usage

```svelte
<script lang="ts">
	import { LineReveal } from "$lib/fancy-ui/line-reveal";
</script>

<LineReveal
	text="Text measurement and layout without touching the DOM."
	font="700 40px Helvetica, Arial, sans-serif"
/>
```

## Props

| Prop         | Type      | Default                          | Description                                                  |
| ------------ | --------- | -------------------------------- | ------------------------------------------------------------ |
| `text`       | `string`  | — (required)                     | Text to reveal                                               |
| `font`       | `string`  | `"600 32px \"Helvetica Neue\", Helvetica, Arial, sans-serif"` | CSS font shorthand, used for both measurement and rendering |
| `lineHeight` | `number`  | `1.2 × font size`                | Line height in pixels                                        |
| `stagger`    | `number`  | `0.08`                           | Delay between lines in seconds                               |
| `duration`   | `number`  | `0.7`                            | Animation duration per line in seconds                       |
| `delay`      | `number`  | `0`                              | Initial delay in seconds                                     |
| `once`       | `boolean` | `true`                           | Animate only on first viewport entry                         |
| `class`      | `string`  | —                                | Additional CSS classes                                       |

## Notes

- `font` must be a valid canvas `ctx.font` shorthand (weight, size in px, family).
- Measurement happens client-side only (pretext needs a canvas); during SSR the
  raw text is rendered hidden so content stays in the HTML.
- Resizing the container re-wraps lines without replaying the animation.
