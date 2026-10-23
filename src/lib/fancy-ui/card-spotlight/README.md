# Card Spotlight

Card with a mouse-following radial gradient spotlight overlay that appears on hover.

## Props

| Prop              | Type     | Default     | Description                      |
| ----------------- | -------- | ----------- | -------------------------------- |
| `class`           | `string` | `''`        | Classes for the outer container  |
| `slotClass`       | `string` | `''`        | Classes for the content wrapper  |
| `gradientSize`    | `number` | `200`       | Radius of the spotlight gradient |
| `gradientColor`   | `string` | `'#262626'` | Color of the spotlight           |
| `gradientOpacity` | `number` | `0.8`       | Opacity of the gradient overlay  |

## Usage

```svelte
<CardSpotlight class="h-64 w-80" gradientColor="#3b82f6">
	<div class="p-6">
		<h3 class="text-lg font-bold">Title</h3>
		<p>Content here</p>
	</div>
</CardSpotlight>
```

## HDR (beta)

The CSS spotlight stops at SDR white. With `hdr` (beta, off by default — pass `hdr` to opt in), `card-spotlight-hdr.ts` feeds the shared HDR light layer (`_internals/hdr/hdr-light.ts`): a soft core at the pointer in the spotlight's own colour, fading over the same ~300 ms as the CSS layer. The light scales the colour's energy, so the default dark grey stays dim while a vivid colour glows past white. It runs only on displays that report HDR with WebGPU extended tone mapping; elsewhere nothing is created.
