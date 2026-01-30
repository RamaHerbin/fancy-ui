# DirectionAwareHover

An image card that reveals an overlay sliding in from the direction the mouse entered.

## Source

Ported from `vendor/inspira/ui/direction-aware-hover/DirectionAwareHover.vue`

## Features

- **Direction detection**: Overlay slides in from the direction the cursor enters
- **Image parallax**: Image shifts slightly opposite to the hover direction
- **Touch support**: Tap on mobile to reveal, auto-hides after 3 seconds
- **Responsive**: Scales from mobile to desktop with appropriate sizing
- **Reduced motion**: Respects `prefers-reduced-motion`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageUrl` | `string` | (required) | URL of the image to display |
| `imageAlt` | `string` | `'image'` | Alt text for the image |
| `class` | `string` | `''` | Additional CSS classes for the container |
| `imageClass` | `string` | `''` | Additional CSS classes for the image |
| `childrenClass` | `string` | `''` | Additional CSS classes for the content overlay |

## Snippets

| Snippet | Description |
|---------|-------------|
| `children` | Content to display on hover overlay |

## Usage

```svelte
<script>
  import { DirectionAwareHover } from '$lib/fancy-ui/direction-aware-hover';
</script>

<DirectionAwareHover imageUrl="/photo.jpg">
  <p class="font-bold">Title</p>
  <p class="text-sm">Subtitle</p>
</DirectionAwareHover>
```

## Porting Notes

- Replaced Vue `Transition` with Svelte `transition:fade`
- Replaced Vue computed with Svelte `$derived`
- Extracted `mapDirection` helper to avoid repeated switch blocks
- Used plain object for `getDirection` touch coordinates instead of constructing a `MouseEvent`
