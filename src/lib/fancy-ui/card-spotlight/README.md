# Card Spotlight

Card with a mouse-following radial gradient spotlight overlay that appears on hover.

## Props

| Prop              | Type     | Default     | Description                          |
| ----------------- | -------- | ----------- | ------------------------------------ |
| `class`           | `string` | `''`        | Classes for the outer container      |
| `slotClass`       | `string` | `''`        | Classes for the content wrapper      |
| `gradientSize`    | `number` | `200`       | Radius of the spotlight gradient     |
| `gradientColor`   | `string` | `'#262626'` | Color of the spotlight               |
| `gradientOpacity` | `number` | `0.8`       | Opacity of the gradient overlay      |

## Usage

```svelte
<CardSpotlight class="h-64 w-80" gradientColor="#3b82f6">
  <div class="p-6">
    <h3 class="text-lg font-bold">Title</h3>
    <p>Content here</p>
  </div>
</CardSpotlight>
```
