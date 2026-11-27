# FlipWords

Cycling word animation. Cycles through an array of words with per-letter fade-in animation. Each word appears letter-by-letter, stays visible for `duration` ms, then fades out before the next word appears.

## Props

| Prop       | Type       | Default  | Description                        |
| ---------- | ---------- | -------- | ---------------------------------- |
| `words`    | `string[]` | required | Array of words to cycle through    |
| `duration` | `number`   | `3000`   | Time each word stays visible (ms)  |
| `class`    | `string`   | `''`     | Additional CSS classes             |

## Usage

```svelte
<FlipWords words={["Better", "Faster", "Stronger", "Bolder"]} />
```

## Reduced motion

With `prefers-reduced-motion: reduce` the words stop cycling and the first word stays on screen, fully visible: no letter fade-in, no flip. The preference is read live, so the cycle starts again if it changes back.
