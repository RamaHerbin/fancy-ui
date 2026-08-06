# Focus

A text component that cycles through words, focusing on one at a time with a decorative frame. Non-focused words are blurred.

## Props

| Prop                     | Type      | Default          | Description                    |
| ------------------------ | --------- | ---------------- | ------------------------------ |
| `sentence`               | `string`  | `"Fancy Focus"` | Sentence to split into words   |
| `manualMode`             | `boolean` | `false`          | Focus on hover instead of auto |
| `blurAmount`             | `number`  | `5`              | Blur amount for unfocused words (px) |
| `borderColor`            | `string`  | `"green"`        | Corner bracket border color    |
| `animationDuration`      | `number`  | `0.5`            | Animation duration in seconds  |
| `pauseBetweenAnimations` | `number`  | `1`              | Pause between words in seconds |
| `class`                  | `string`  | `""`             | Additional CSS classes         |

## Usage

```svelte
<Focus sentence="Create stunning interfaces" borderColor="cyan" />
```
