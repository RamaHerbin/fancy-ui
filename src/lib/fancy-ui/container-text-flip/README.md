# ContainerTextFlip

A text container that cycles through words with per-character blur-to-clear animation.

Native attributes and listeners go to the root `<p>`. `class` keeps its current target.

## Props

| Prop                | Type       | Default                                    | Description               |
| ------------------- | ---------- | ------------------------------------------ | ------------------------- |
| `words`             | `string[]` | `["better","modern","beautiful","awesome"]` | Words to cycle through    |
| `interval`          | `number`   | `3000`                                     | Time between words (ms)   |
| `animationDuration` | `number`   | `700`                                      | Letter animation (ms)     |
| `class`             | `string`   | `""`                                       | Additional CSS classes    |
| `textClass`         | `string`   | `""`                                       | CSS classes for text span |

## Usage

```svelte
<ContainerTextFlip
  words={["stunning", "brilliant", "amazing"]}
  interval={2500}
/>
```

## Reduced motion

With `prefers-reduced-motion: reduce` the words stop flipping and the first word stays visible, with no blur-in on its letters. The preference is read live, so the cycle starts again if it changes back.
