# SparklesText

Text with animated sparkle star overlay. SVG stars animate with fade/scale/rotation effects and regenerate periodically.

## Props

| Prop            | Type                                | Default                                   | Description             |
| --------------- | ----------------------------------- | ----------------------------------------- | ----------------------- |
| `text`          | `string`                            | required                                  | Text to display         |
| `sparklesCount` | `number`                            | `10`                                      | Number of sparkle stars |
| `colors`        | `{ first: string; second: string }` | `{ first: '#9E7AFF', second: '#FE8BBB' }` | Two colors for sparkles |
| `class`         | `string`                            | `''`                                      | Additional CSS classes  |

## Usage

```svelte
<SparklesText text="Sparkle!" />
<SparklesText text="Golden" colors={{ first: "#FFD700", second: "#FFA500" }} />
```
