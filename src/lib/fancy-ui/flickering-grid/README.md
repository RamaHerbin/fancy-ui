# FlickeringGrid

Canvas-based grid of squares with flickering opacity. Uses ResizeObserver, IntersectionObserver, and requestAnimationFrame for performant rendering with automatic pause when off-screen.

## Props

| Prop            | Type     | Default     | Description                                    |
| --------------- | -------- | ----------- | ---------------------------------------------- |
| `squareSize`    | `number` | `4`         | Size of each grid square in pixels             |
| `gridGap`       | `number` | `6`         | Gap between squares in pixels                  |
| `flickerChance` | `number` | `0.3`       | Probability of opacity change per second (0-1) |
| `color`         | `string` | `'#000000'` | Color of the squares (hex format)              |
| `maxOpacity`    | `number` | `0.3`       | Maximum opacity of squares (0-1)               |
| `width`         | `number` | `undefined` | Fixed width (defaults to container width)      |
| `height`        | `number` | `undefined` | Fixed height (defaults to container height)    |
| `class`         | `string` | `''`        | Additional CSS classes                         |

## Usage

```svelte
<div class="h-64 w-full">
	<FlickeringGrid color="#6366f1" maxOpacity={0.5} flickerChance={0.2} />
</div>
```
