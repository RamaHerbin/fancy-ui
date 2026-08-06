# NeonBorder

Dual-color neon glow border effect. Two gradient layers with blur and drop-shadow create a bicolor neon effect with optional rotation animation.

## Props

| Prop            | Type                         | Default     | Description                   |
| --------------- | ---------------------------- | ----------- | ----------------------------- |
| `color1`        | `string`                     | `'#0496ff'` | First neon color              |
| `color2`        | `string`                     | `'#ff0a54'` | Second neon color             |
| `animationType` | `'none' \| 'half' \| 'full'` | `'half'`    | Animation coverage type       |
| `duration`      | `number`                     | `6`         | Animation duration in seconds |
| `class`         | `string`                     | `''`        | Additional CSS classes        |

## Slots

- **default** — Content rendered inside the neon border

## Usage

```svelte
<NeonBorder color1="#0496ff" color2="#ff0a54" animationType="half">
	<div class="bg-background rounded-lg px-4 py-2 text-center">Neon content</div>
</NeonBorder>
```
