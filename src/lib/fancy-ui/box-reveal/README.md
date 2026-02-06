# BoxReveal

Sliding box reveal animation. Content fades up while a colored box slides from left to right, revealing the content underneath. Triggers on viewport entry.

## Props

| Prop       | Type     | Default    | Description                         |
| ---------- | -------- | ---------- | ----------------------------------- |
| `color`    | `string` | `'#5046e6'`| Color of the reveal box             |
| `duration` | `number` | `0.5`      | Animation duration (seconds)        |
| `delay`    | `number` | `0.25`     | Delay before animation (seconds)    |
| `class`    | `string` | `''`       | Additional CSS classes              |

## Usage

```svelte
<BoxReveal>
  <h1>Revealed content</h1>
</BoxReveal>

<BoxReveal color="#ff6600" duration={0.8}>
  <p>Custom color and speed</p>
</BoxReveal>
```
