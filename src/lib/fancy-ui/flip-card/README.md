# FlipCard

A card that flips to reveal back content on hover, using pure CSS 3D transforms.

## Props

| Prop     | Type         | Default | Description                     |
| -------- | ------------ | ------- | ------------------------------- |
| `rotate` | `"x" \| "y"` | `"y"`   | Axis of rotation                |
| `class`  | `string`     | `""`    | Additional CSS classes          |

## Snippets

- `children` — Front face content
- `back` — Back face content

## Usage

```svelte
<FlipCard>
  <img src="/front.jpg" alt="Front" class="size-full object-cover" />
  {#snippet back()}
    <p>Back content here</p>
  {/snippet}
</FlipCard>
```
