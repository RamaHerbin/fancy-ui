# TextGenerateEffect

Typewriter-style text reveal that fades in words one by one with an optional blur effect.

## Props

| Prop       | Type      | Default  | Description                                |
| ---------- | --------- | -------- | ------------------------------------------ |
| `words`    | `string`  | required | Text to animate (split on spaces)          |
| `filter`   | `boolean` | `true`   | Enable blur-to-sharp transition            |
| `duration` | `number`  | `0.7`    | Transition duration per word (seconds)     |
| `delay`    | `number`  | `0`      | Initial delay before animation starts (ms) |
| `stagger`  | `number`  | `200`    | Delay between each word appearing (ms)     |
| `class`    | `string`  | —        | Additional CSS classes                     |
