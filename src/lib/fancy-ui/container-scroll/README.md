# ContainerScroll

A scroll-driven aperture. The card starts shut, as a slim horizontal slit with a bright seam of light across its middle. As the section scrolls into view the slit opens vertically to the full card, the seam splits into two lips that ride the opening edges and fade out, the card content settles from a slight zoom into focus, and the title above blurs and fades to hand the stage over. There is no 3D tilt and no perspective.

The card sits in a nested hairline frame: an outer frame (`#f4f4f5` light, `#0f0f10` dark) with a 1px hairline, a few pixels of padding, then an inner surface with its own hairline. The ambient shadow fades in as the card opens.

## Props

| Prop              | Type     | Default                | Description                                       |
| ----------------- | -------- | ---------------------- | ------------------------------------------------- |
| `class`           | `string` | `""`                   | Additional CSS classes on the section             |
| `accent`          | `string` | soft blue (`#8fb2ff`)  | Seam colour. Its white-hot core is mixed from it  |
| `accentSecondary` | `string` | soft lilac (`#c3b1ff`) | Second tint, blended towards the ends of the seam |

## Snippets

- `titleContent` — Title above the card (blurs and fades as the card opens)
- `cardContent` — Content revealed inside the card (settles from a slight zoom)

## Theming

Everything is driven by CSS custom properties on the section, so you can also theme it from a class:

- `--cs-accent`, `--cs-accent-2` — the two seam colours (what the props set)
- `--cs-progress` — raw scroll progress, 0 → 1 (written by the component)
- `--cs-open` — eased progress used for the aperture (written by the component)

## How progress is measured

Progress is read from the card track's bounding box, at its centre (where the slit sits): 0 while that centre is still in the bottom 8% of the viewport, rising linearly to 1 once it has climbed to just above the middle of the viewport (52% from the top). The aperture itself follows a smoothstep of that value, so it opens gently and settles slowly. Updates run at most once per animation frame, and scrolling inside a nested scroll container is tracked too.

## Reduced motion

With `prefers-reduced-motion: reduce` the card is always fully open and still, the title stays sharp, and the seam and lips are not drawn.

## Usage

```svelte
<ContainerScroll>
	{#snippet titleContent()}
		<h2 class="text-4xl font-semibold">Bring the whole picture into focus.</h2>
	{/snippet}
	{#snippet cardContent()}
		<img src="/screenshot.png" alt="Product dashboard" class="size-full object-cover" />
	{/snippet}
</ContainerScroll>
```
