# ColourfulText

Per-character color animation. Each character is individually animated with shuffled colors that reshuffle every 5 seconds. Pure CSS transitions — no motion library dependency.

## Props

| Prop         | Type       | Default                    | Description                              |
| ------------ | ---------- | -------------------------- | ---------------------------------------- |
| `text`       | `string`   | **required**               | Text to animate                          |
| `colors`     | `string[]` | 10 rainbow colors          | Array of colors to cycle through         |
| `startColor` | `string`   | `'rgb(255, 255, 255)'`     | Initial color before animation           |
| `duration`   | `number`   | `0.5`                      | Transition duration per character (secs) |
| `class`      | `string`   | `''`                       | Additional CSS classes                   |

## Usage

```svelte
<h1 class="text-4xl font-bold">
  Make things <ColourfulText text="colourful" />
</h1>
```
