# SparklesText

Text with animated sparkle star overlay. SVG stars animate with fade/scale/rotation effects and regenerate periodically.

## Props

| Prop            | Type                               | Default                                      | Description                |
| --------------- | ---------------------------------- | -------------------------------------------- | -------------------------- |
| `text`          | `string`                           | required                                     | Text to display            |
| `sparklesCount` | `number`                           | `10`                                         | Number of sparkle stars    |
| `colors`        | `{ first: string; second: string }`| `{ first: '#9E7AFF', second: '#FE8BBB' }`   | Two colors for sparkles    |
| `class`         | `string`                           | `''`                                         | Additional CSS classes     |

## Usage

```svelte
<SparklesText text="Sparkle!" />
<SparklesText text="Golden" colors={{ first: '#FFD700', second: '#FFA500' }} />
```

## Reduced motion

With `prefers-reduced-motion: reduce` the sparkles stop pulsing and stop regenerating: each star is held still at its mid-twinkle pose, so the text keeps its sparkles without the movement. The preference is read live, so the twinkle resumes if it changes back.
