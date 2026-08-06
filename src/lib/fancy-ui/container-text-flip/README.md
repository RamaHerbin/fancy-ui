# ContainerTextFlip

A text container that cycles through words with per-character blur-to-clear animation.

## Props

| Prop                | Type       | Default                                     | Description               |
| ------------------- | ---------- | ------------------------------------------- | ------------------------- |
| `words`             | `string[]` | `["better","modern","beautiful","awesome"]` | Words to cycle through    |
| `interval`          | `number`   | `3000`                                      | Time between words (ms)   |
| `animationDuration` | `number`   | `700`                                       | Letter animation (ms)     |
| `class`             | `string`   | `""`                                        | Additional CSS classes    |
| `textClass`         | `string`   | `""`                                        | CSS classes for text span |

## Usage

```svelte
<ContainerTextFlip words={["stunning", "brilliant", "amazing"]} interval={2500} />
```
