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

| Prop                      | Type                | Default                             | Description                                                           |
| ------------------------- | ------------------- | ----------------------------------- | --------------------------------------------------------------------- |
| `firstImage`              | `string`            | `''`                                | URL of the first (left) image                                         |
| `secondImage`             | `string`            | `''`                                | URL of the second (right) image                                       |
| `firstImageAlt`           | `string`            | `'First image'`                     | Alt text for first image                                              |
| `secondImageAlt`          | `string`            | `'Second image'`                    | Alt text for second image                                             |
| `class`                   | `string`            | `''`                                | Additional CSS classes                                                |
| `firstContentClass`       | `string`            | `''`                                | CSS classes for first content                                         |
| `secondContentClass`      | `string`            | `''`                                | CSS classes for second content                                        |
| `initialSliderPercentage` | `number`            | `50`                                | Initial slider position (0-100)                                       |
| `slideMode`               | `'hover' \| 'drag'` | `'hover'`                           | Interaction mode                                                      |
| `showHandlebar`           | `boolean`           | `true`                              | Show the drag handle                                                  |
| `autoplay`                | `boolean`           | `false`                             | Enable auto-animation                                                 |
| `autoplayDuration`        | `number`            | `5000`                              | Duration of one autoplay cycle (ms)                                   |
| `beamColors`              | `string[]`          | `['#22d3ee', '#818cf8', '#f472b6']` | Beam colours: left fringe, centre, right fringe (one or more colours) |
| `label`                   | `string`            | `'Comparison slider'`               | Accessible name of the slider                                         |

## Events (Callbacks)

| Callback             | Type                           | Description                         |
| -------------------- | ------------------------------ | ----------------------------------- |
| `onpercentagechange` | `(percentage: number) => void` | Called when slider position changes |
| `ondragstart`        | `() => void`                   | Called when drag starts             |
| `ondragend`          | `() => void`                   | Called when drag ends               |
| `onhoverenter`       | `() => void`                   | Called when mouse enters            |
| `onhoverleave`       | `() => void`                   | Called when mouse leaves            |

## Snippets

| Snippet         | Description                       |
| --------------- | --------------------------------- |
| `firstContent`  | Custom content for the left side  |
| `secondContent` | Custom content for the right side |
| `handle`        | Custom handle element             |

## Usage

```svelte
<script>
  import { Compare } from 'fancy-ui-svelte';
</script>

<!-- Basic usage with images -->
<Compare firstImage="/before.jpg" secondImage="/after.jpg" class="rounded-lg" />

<!-- Drag mode -->
<Compare firstImage="/before.jpg" secondImage="/after.jpg" slideMode="drag" />

<!-- With autoplay -->
<Compare firstImage="/before.jpg" secondImage="/after.jpg" autoplay autoplayDuration={3000} />

<!-- Custom content -->
<Compare>
	{#snippet firstContent()}
		<div class="flex size-full items-center justify-center bg-blue-500">Before</div>
	{/snippet}
	{#snippet secondContent()}
		<div class="flex size-full items-center justify-center bg-red-500">After</div>
	{/snippet}
</Compare>
```

## StarField

`StarField` is also exported from the folder barrel (`compare/index.ts`), next to `Compare`. It is a standalone field of white stars that twinkle and drift, filling its positioned parent. The stars are placed once, at random, when the component mounts.

| Prop         | Type     | Default | Description               |
| ------------ | -------- | ------- | ------------------------- |
| `starsCount` | `number` | `130`   | Number of stars to render |
| `class`      | `string` | `''`    | Additional CSS classes    |

```svelte
<script>
  import { StarField } from 'fancy-ui-svelte';
</script>

<StarField starsCount={60} class="absolute inset-0" />
```

## Implementation Notes

- Replaced Vue `emit` with callback props (`onpercentagechange`, etc.)
- Replaced Vue slots with Svelte snippets
- Replaced Nuxt Icon with inline SVG
- Used Svelte 5 runes (`$state`, `$effect`, `$props`)

## HDR

The seam's CSS beam stops at SDR white. With `hdr` (on by default), `compare-hdr.ts` feeds the shared HDR light layer (`_internals/hdr/hdr-light.ts`): a full-height core on the seam that climbs toward ~1000 nits with the beam's energy, its two chromatic fringes, and a soft wash where the speed trail stretches. It runs only on displays that report HDR with WebGPU extended tone mapping; elsewhere nothing is created.
