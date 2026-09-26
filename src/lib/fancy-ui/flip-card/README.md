# FlipCard

A card that flips in 3D to reveal its back. It lifts through the middle of the turn and lands with a slight overshoot, its shadow spreads and gathers, and the faces catch the light as they turn: a sheen sweeps across and the face darkens as it goes edge-on. It flips on hover (and keyboard focus, and tap), or as a toggle button on click.

## Usage

```svelte
<!-- A toggle: click, tap, Enter or Space; driven from outside too -->
<script lang="ts">
	let flipped = $state(false);
</script>

<FlipCard>
	<img src="/front.jpg" alt="Front" class="size-full object-cover" />
	{#snippet back()}
		<p>Back content here</p>
	{/snippet}
</FlipCard>
<FlipCard trigger="click" bind:flipped label="Membership card">…</FlipCard>
```

## Props

| Prop       | Type                         | Default   | Description                                                      |
| ---------- | ---------------------------- | --------- | ---------------------------------------------------------------- |
| `rotate`   | `"x" \| "y"`                 | `"y"`     | Axis of rotation                                                 |
| `trigger`  | `"hover" \| "click"`         | `"hover"` | Hover (plus focus and tap), or a toggle button                   |
| `flipped`  | `boolean` (bindable)         | `false`   | Whether the back is showing                                      |
| `onflip`   | `(flipped: boolean) => void` | —         | Called with the new state after every flip                       |
| `duration` | `number`                     | `700`     | Length of one flip in milliseconds                               |
| `glare`    | `boolean`                    | `true`    | Light the faces as they turn (sheen + edge-on shade)             |
| `label`    | `string`                     | —         | Accessible name for the card                                     |
| `class`    | `string`                     | `""`      | Additional CSS classes (size the card here: default `h-72 w-56`) |

## Snippets

- `children` — Front face content
- `back` — Back face content

## Behaviour

- **Continuous turns.** Every flip adds half a turn to one accumulated angle, so the card keeps turning the same way instead of rewinding. In hover mode it turns the way the pointer travels: in from the left (or out through the right) turns one way, the opposite side the other; on the X axis, top and bottom.
- **Hover mode** also flips on keyboard focus (and back on blur, unless focus stays inside), and on a tap, since touch has no hover.
- **Click mode** makes the card a toggle button (`role="button"`, `aria-pressed`): click, tap, Enter or Space. A link or button inside a face keeps its own click.
- The face turned away is `inert` and `aria-hidden`: never focusable, never read.
- A `flipped` changed from outside turns the card too; `onflip` reports every change.

## How it animates

- One registered property, `--fc-angle`, carries the rotation. JS only sets its target (`--fc-target`); CSS transitions it over `duration` with `cubic-bezier(0.34, 1.25, 0.64, 1)` (a slight overshoot).
- The faces read the same angle to light themselves, with CSS `sin()`: shade = `|sin|` (darkest edge-on), sheen position slides with `sin`, and its opacity peaks part-way round. Behind `@supports (opacity: calc(sin(30deg)))`, so older browsers simply get no lighting.
- The lift (`translateZ` + a 5% scale at 45% of the turn) and the shadow (spreading, lighter, then back) are short Web Animations run on each flip.
- **Reduced motion:** no rotation, lift or lighting; the faces cross-fade in place over 200 ms.
