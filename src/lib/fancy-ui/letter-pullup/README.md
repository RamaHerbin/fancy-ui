# LetterPullup

Staggered letter pull-up animation. Each character pulls up from below with a configurable delay between letters, creating a wave-like entrance effect.

Native attributes and listeners go to the root `<div>`. `class` still styles each letter.

## Props

| Prop    | Type     | Default | Description                                 |
| ------- | -------- | ------- | ------------------------------------------- |
| `words` | `string` | required| Text to animate                             |
| `delay` | `number` | `0.05`  | Delay between each letter animation (secs)  |
| `class` | `string` | `''`    | Additional CSS classes                      |

## Usage

```svelte
<LetterPullup words="Hello World" />
<LetterPullup words="Slow reveal" delay={0.1} />
```

## Reduced motion

With `prefers-reduced-motion: reduce` the letters are simply there: no pull-up and no stagger, the whole text is visible and in place from the first paint. The animation is switched on only for visitors who have not asked for less motion.
