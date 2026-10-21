# TickNav

A vertical navigation list set on a ruler of tick marks. Every row is a
one-pixel line with its label beside it, and short ticks run between rows.
Hovering a row plucks its line like a string, the line lengthens on a spring,
and the neighbouring lines and ticks stretch and take the accent colour with a
smooth falloff. An optional `preview` snippet renders a card that follows the
pointer.

```svelte
<TickNav {items} bind:value ariaLabel="Guide">
	{#snippet preview(item)}
		<img src={thumbs[item.id]} alt="" />
	{/snippet}
</TickNav>
```

## Implementation notes

- **Shared engine.** Everything that moves lives in `tick-nav-core.ts`, a
  framework-free module carried byte for byte by the Svelte, React and Vue
  trees (`shared-cores.json`). The component renders markup and forwards
  `reach`, the current index and reduced motion.
- **Springs.** Each row has a length spring (32 → 55 px, stiffness 250,
  damping 30) and a proximity spring (stiffness 400, damping 30, mass 0.6)
  whose target is a smoothstep of the distance, in rows, to the hovered row
  over `reach` rows. Tick groups sit half a row below their item and have their
  own proximity spring. Lines gain 16 px at full proximity, ticks go from 24 to
  40 px and up to 60% accent.
- **Pluck.** Every line, rows and ticks alike, plucks the moment the pointer
  crosses it: a 500 ms wave packet (ease-out cubic) runs along it and leaves
  it flat. Crossings are found between consecutive pointer positions, so a
  fast sweep plucks every line it passed, in order, like a strum. Ticks swing
  at 70%. Keyboard focus, or a pointer entering the list from the side, plucks
  the row it lands on.
- **No per-frame framework state.** Output is CSS variables (`--tn-len`,
  `--tn-near`, `--tn-tick-near` per row; `--tn-px`, `--tn-py`, `--tn-po` on the
  root) plus the pluck path's `d`. The rAF loop sleeps once every spring has
  settled.
- **Hit area.** Rows are 1 px tall; a 28 px `::after` makes them easy to hit and
  overlaps the ticks, so moving between rows never passes through "nothing
  hovered" and the card does not flicker.
- **Input.** Touch is ignored. Keyboard focus (`:focus-visible`) activates the
  row and places the card beside it.
- **Reduced motion.** Springs snap and there is no pluck.
- **Accessibility.** A `<nav>` landmark (`ariaLabel`) with real links or
  buttons; `aria-current="page"` on the current row; lines, ticks and the card
  are `aria-hidden`.
- **Sound.** With `sound`, every pluck from a mouse or pen plays a cue: `hover`
  for an item's line, `tick` at 60% for a ruler tick.

## Theming

| Variable          | Default               | Role                            |
| ----------------- | --------------------- | ------------------------------- |
| `--tn-accent`     | `var(--ft-accent, …)` | Lit lines, ticks, hovered label |
| `--tn-border`     | `currentColor` at 16% | Resting lines and ticks         |
| `--tn-row-gap`    | `0.5rem`              | Space between lines and ticks   |
| `--tn-preview-bg` | `Canvas`              | Card background                 |
