# TextRevealCard

A card that reveals text as the user drags their mouse horizontally. Features animated stars in the background.

## Components

- `TextRevealCard` — Main card with mouse/touch reveal
- `TextRevealStars` — Animated floating star dots

## Props (TextRevealCard)

| Prop         | Type     | Default | Description               |
| ------------ | -------- | ------- | ------------------------- |
| `starsCount` | `number` | `130`   | Number of star dots       |
| `starsClass` | `string` | `""`    | CSS classes for star dots |
| `class`      | `string` | `""`    | Additional CSS classes    |

## Snippets

- `children` — Header content above the reveal area
- `text` — The revealed text (shown on mouse drag)
- `revealText` — The base text (always visible)

## Usage

```svelte
<TextRevealCard>
	<p class="text-lg font-bold text-white">Hover to reveal</p>
	{#snippet text()}
		<p class="text-4xl font-bold text-white">Revealed!</p>
	{/snippet}
	{#snippet revealText()}
		<p class="text-4xl font-bold text-white/20">Hidden text</p>
	{/snippet}
</TextRevealCard>
```
