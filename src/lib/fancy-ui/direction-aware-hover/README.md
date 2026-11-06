# DirectionAwareHover

An image card that reveals an overlay sliding in from the direction the mouse entered.

## Features

- **Direction detection**: Overlay slides in from the direction the cursor enters
- **Image parallax**: Image shifts slightly opposite to the hover direction
- **Touch support**: Tap on mobile to reveal, auto-hides after 3 seconds
- **Responsive**: Scales from mobile to desktop with appropriate sizing
- **Reduced motion**: Respects `prefers-reduced-motion`

## Accessibility

- The card is a focusable figure (`tabindex="0"`, `role="figure"`): keyboard focus shows the fully presented state, with the overlay in from the top, the image shifted and the caption visible. Blur returns to rest.
- Nothing extra is announced on focus: the caption is already in the DOM.
- Touch pointers never drive the hover path; a tap uses the touch reveal and auto-hides.

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
  import { DirectionAwareHover } from 'fancy-ui-svelte';
</script>

<DirectionAwareHover imageUrl="/photo.jpg">
  <p class="font-bold">Title</p>
  <p class="text-sm">Subtitle</p>
</DirectionAwareHover>
```

## Implementation Notes

- Replaced Vue `Transition` with Svelte `transition:fade`
- Replaced Vue computed with Svelte `$derived`
- Extracted `mapDirection` helper to avoid repeated switch blocks
- Used plain object for `getDirection` touch coordinates instead of constructing a `MouseEvent`
