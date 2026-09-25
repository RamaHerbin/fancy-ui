# Compare

A before/after image comparison slider split by a blade of light.

## Features

- **Two slide modes**: `hover` (follows cursor) or `drag` (click and drag)
- **Autoplay**: Automatic back-and-forth animation
- **Custom content**: Supports images or custom snippets for both sides
- **A seam of light**: a white-hot core with a chromatic fringe and a glow that spills onto both sides; pulses of light run along it, faster while you interact
- **Motion trail**: moving the seam leaves a trail behind it that stretches with the speed of the gesture and settles when it stops
- **Glass handle**: a frosted bead with a ring of light round it
- **Keyboard**: arrow keys move by 2%, Shift+arrows and Page Up/Down by 10%, Home/End jump to the ends
- **Soft return**: in hover mode the seam glides back to its resting place when the pointer leaves
- **Reduced motion**: no pulses, no trail, no glide
- **Touch support**: Works on mobile devices

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `firstImage` | `string` | `''` | URL of the first (left) image |
| `secondImage` | `string` | `''` | URL of the second (right) image |
| `firstImageAlt` | `string` | `'First image'` | Alt text for first image |
| `secondImageAlt` | `string` | `'Second image'` | Alt text for second image |
| `class` | `string` | `''` | Additional CSS classes |
| `firstContentClass` | `string` | `''` | CSS classes for first content |
| `secondContentClass` | `string` | `''` | CSS classes for second content |
| `initialSliderPercentage` | `number` | `50` | Initial slider position (0-100) |
| `slideMode` | `'hover' \| 'drag'` | `'hover'` | Interaction mode |
| `showHandlebar` | `boolean` | `true` | Show the drag handle |
| `autoplay` | `boolean` | `false` | Enable auto-animation |
| `autoplayDuration` | `number` | `5000` | Duration of one autoplay cycle (ms) |
| `beamColors` | `string[]` | `['#22d3ee', '#818cf8', '#f472b6']` | Beam colours: left fringe, centre, right fringe (one or more colours) |
| `label` | `string` | `'Comparison slider'` | Accessible name of the slider |

## Events (Callbacks)

| Callback | Type | Description |
|----------|------|-------------|
| `onpercentagechange` | `(percentage: number) => void` | Called when slider position changes |
| `ondragstart` | `() => void` | Called when drag starts |
| `ondragend` | `() => void` | Called when drag ends |
| `onhoverenter` | `() => void` | Called when mouse enters |
| `onhoverleave` | `() => void` | Called when mouse leaves |

## Snippets

| Snippet | Description |
|---------|-------------|
| `firstContent` | Custom content for the left side |
| `secondContent` | Custom content for the right side |
| `handle` | Custom handle element |

## Usage

```svelte
<script>
  import { Compare } from '$lib/fancy-ui/compare';
</script>

<!-- Basic usage with images -->
<Compare
  firstImage="/before.jpg"
  secondImage="/after.jpg"
  class="rounded-lg"
/>

<!-- Drag mode -->
<Compare
  firstImage="/before.jpg"
  secondImage="/after.jpg"
  slideMode="drag"
/>

<!-- With autoplay -->
<Compare
  firstImage="/before.jpg"
  secondImage="/after.jpg"
  autoplay
  autoplayDuration={3000}
/>

<!-- Custom content -->
<Compare>
  {#snippet firstContent()}
    <div class="bg-blue-500 size-full flex items-center justify-center">
      Before
    </div>
  {/snippet}
  {#snippet secondContent()}
    <div class="bg-red-500 size-full flex items-center justify-center">
      After
    </div>
  {/snippet}
</Compare>
```

## Implementation Notes

- Replaced Vue `emit` with callback props (`onpercentagechange`, etc.)
- Replaced Vue slots with Svelte snippets
- Replaced Nuxt Icon with inline SVG
- Used Svelte 5 runes (`$state`, `$effect`, `$props`)
