# MathBubble

A comic bubble that draws itself, then a formula written inside it by hand,
stroke by stroke, at a steady writing speed. Speech, thought and shout bubbles,
a tail on any side, and an array of formulas that cycles.

```svelte
<MathBubble formula={"e^{i\\pi}+1=0"} />

<MathBubble formula={["a^2+b^2=c^2", "\\frac{d}{dx}e^x=e^x"]} bubble="thought" tail="left" loop />
```

Glyphs are an original hand-drawn alphabet: every letter, digit, Greek letter
and operator is a set of pen strokes drawn for this component, not a font.

## Props

| Prop          | Type                                         | Default          | Description                                                            |
| ------------- | -------------------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| `formula`     | `string \| string[]`                         | —                | Formula in a small TeX subset; an array is written one after the other |
| `bubble`      | `"speech" \| "thought" \| "shout" \| "none"` | `"speech"`       | Outline drawn around the formula                                       |
| `tail`        | `"left" \| "right" \| "bottom" \| "top"`     | `"bottom"`       | Side the tail points to                                                |
| `tailOffset`  | `number`                                     | `0.25`           | Where the tail leaves its side, 0..1                                   |
| `speed`       | `number`                                     | `5`              | Writing speed, em per second                                           |
| `seed`        | `number`                                     | `1`              | Seed of the hand; the same seed always draws the same strokes          |
| `size`        | `number`                                     | `32`             | Pixels per em                                                          |
| `strokeWidth` | `number`                                     | `2.2`            | Base pen width, px                                                     |
| `ink`         | `string`                                     | `"currentColor"` | Ink colour; resolved when each frame is drawn, so it follows the theme |
| `trigger`     | `"inView" \| "mount" \| "manual"`            | `"inView"`       | Start when 60% visible (once), on mount, or only through `play()`      |
| `loop`        | `boolean`                                    | `false`          | Start again after the last formula                                     |
| `hold`        | `number`                                     | `1800`           | Rest on a finished formula before the next one, ms                     |
| `ariaLabel`   | `string`                                     | formula text     | Accessible name of the image                                           |
| `t`           | `number`                                     | —                | Renders one still at this time (ms) with no animation loop             |
| `class`       | `string`                                     | —                | Additional CSS classes on the wrapper                                  |
| `onComplete`  | `() => void`                                 | —                | Called when the last formula is written (once per pass when looping)   |

### Methods

Bind the component (`bind:this`) to call them.

- `play()` writes the formula from the start.
- `reset()` stops and returns to the first formula's finished still.

## Supported TeX

`^` and `_` with `{}` groups, `\frac{a}{b}`, `\sqrt{x}` and `\sqrt[n]{x}`,
`\left( … \right)`, Greek letters (`\alpha` … `\Omega`), `\sum`, `\prod`,
`\int`, `\lim`, `\infty`, `\to`, `\cdot`, `\times`, `\pm`, `\leq`, `\geq`,
`\neq`, `\approx`, `\in`, `\partial`, `\nabla` and named functions such as
`\sin` or `\log`. The parser never throws: anything it does not know is
written out as letters.

## Implementation notes

- **Shared engine.** Parsing, layout, the bubble outline, the hand (seeded
  variation, smoothing, pressure), the timeline and drawing live in the
  framework-free `handwrite-*.ts` modules; the component renders markup and
  runs the clock.
- **Without JavaScript.** The server renders the finished drawing as inline
  SVG with `stroke="currentColor"`, so the page reads correctly before
  hydration and with JavaScript off. When the drawing starts, a canvas sized
  for the device pixel ratio takes over and draws one frame of the timeline
  per animation frame; the finished frame goes back to SVG.
- **Deterministic.** No `Math.random` or clock in the render path: the same
  props render the same bytes on the server and in the browser.
- **Reduced motion.** The final frame is shown at once and `onComplete` still
  fires. A preference change mid-drawing snaps to the end.
- **Accessibility.** The wrapper is `role="img"` with the formula (or
  `ariaLabel`) as its name; the SVG and canvas are `aria-hidden`.
