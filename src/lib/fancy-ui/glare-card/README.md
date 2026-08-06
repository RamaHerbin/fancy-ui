# GlareCard

A holographic trading card effect with mouse-tracking glare, rainbow foil, and 3D rotation.

## Props

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `""`    | Additional CSS classes |

## Snippets

- `children` — Card content

## Usage

```svelte
<GlareCard>
	<div class="flex h-full flex-col items-center justify-center p-6 text-white">
		<h3 class="text-xl font-bold">Holographic</h3>
		<p class="text-sm">Move your mouse around</p>
	</div>
</GlareCard>
```
