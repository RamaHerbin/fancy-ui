# GlowingEffect

Mouse-proximity based glowing border effect with animated conic gradient.

## Props

| Prop               | Type                   | Default     | Description                                    |
| ------------------ | ---------------------- | ----------- | ---------------------------------------------- |
| `blur`             | `number`               | `0`         | Blur amount for the glow                       |
| `inactiveZone`     | `number`               | `0.7`       | Inner zone radius ratio where glow deactivates |
| `proximity`        | `number`               | `0`         | Extra proximity distance to activate glow      |
| `spread`           | `number`               | `20`        | Spread angle of the conic gradient             |
| `variant`          | `'default' \| 'white'` | `'default'` | Color variant                                  |
| `glow`             | `boolean`              | `false`     | Force glow visible                             |
| `disabled`         | `boolean`              | `true`      | Disable mouse tracking                         |
| `movementDuration` | `number`               | `2`         | Animation speed                                |
| `borderWidth`      | `number`               | `1`         | Border width in pixels                         |
| `class`            | `string`               | `''`        | Additional CSS classes                         |

## Usage

Place inside a relatively positioned container with `rounded-*` classes:

```svelte
<div class="bg-card relative rounded-xl p-4">
	<GlowingEffect spread={40} glow disabled={false} />
	<p>Content here</p>
</div>
```
