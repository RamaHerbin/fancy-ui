# LetterPullup

Staggered letter pull-up animation. Each character pulls up from below with a configurable delay between letters, creating a wave-like entrance effect.

## Props

| Prop    | Type     | Default  | Description                                |
| ------- | -------- | -------- | ------------------------------------------ |
| `words` | `string` | required | Text to animate                            |
| `delay` | `number` | `0.05`   | Delay between each letter animation (secs) |
| `class` | `string` | `''`     | Additional CSS classes                     |

## Usage

```svelte
<LetterPullup words="Hello World" />
<LetterPullup words="Slow reveal" delay={0.1} />
```
