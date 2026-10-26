# TextRevealCard

A card that reveals text as the user drags their mouse horizontally. Features animated stars in the background.

## Components

- `TextRevealCard` — Main card with mouse/touch reveal
- `TextRevealStars` — Animated floating star dots

## Props (TextRevealCard)

| Prop         | Type     | Default | Description                 |
| ------------ | -------- | ------- | --------------------------- |
| `starsCount` | `number` | `130`   | Number of star dots         |
| `starsClass` | `string` | `""`    | CSS classes for star dots   |
| `class`      | `string` | `""`    | Additional CSS classes      |

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

## Reduced motion

With `prefers-reduced-motion: reduce` the star field behind the hidden text stays still: each star rests where it was placed, at its own brightness, instead of drifting and fading. The pointer reveal is unchanged.

## Accessibility

- The card is focusable (`tabindex="0"`, `role="group"`): keyboard focus reveals the full text at once, with no partial scrub. Escape or blur returns to rest.
- Nothing extra is announced on focus: the revealed text is already in the DOM.
- The pointer scrub is unchanged.
