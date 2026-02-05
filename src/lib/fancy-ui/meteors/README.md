# Meteors

Animated meteor shower effect. Generates N span elements with randomized positions, delays, and durations that animate diagonally across the container.

## Props

| Prop    | Type     | Default | Description                          |
| ------- | -------- | ------- | ------------------------------------ |
| `count` | `number` | `20`    | Number of meteors to render          |
| `class` | `string` | `''`    | Additional CSS classes on each meteor |

## Usage

```svelte
<div class="relative h-64 w-full overflow-hidden bg-black">
  <Meteors count={30} />
</div>
```
