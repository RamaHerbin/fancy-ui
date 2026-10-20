# TickNav

A vertical navigation list set on a ruler of tick marks. Every row has a main
bar, with short minor ticks between rows. Near the pointer the bars stretch and
take the accent colour with a smooth falloff, each label riding the tip of its
bar; the row under the pointer turns its bar into a moving sine. An optional
`preview` snippet renders a card that glides beside the active row.

```svelte
<TickNav {items} bind:value ariaLabel="Guide">
	{#snippet preview(item)}
		<img src={thumbs[item.id]} alt="" />
	{/snippet}
</TickNav>
```

## Implementation notes

- **Proximity field.** Each row's extension (0..1) is a smoothstep of its
  distance to the pointer over `reach` rows. A rAF loop eases every row toward
  its target, fast on the way up (τ 70 ms) and slow on the way down (τ 260 ms),
  so the bars leave a fading trail. Values are written straight to `--tn-e` and
  `--tn-e-next` on each `<li>`; nothing per frame goes through `$state`. Minor
  ticks interpolate between their row and the next one in CSS.
- **Compositor-friendly.** Labels move with `transform`; bars change `width`
  on 1 px tall elements only. The loop stops as soon as every row has settled.
- **Measurement.** Row centres are read once per pointer visit and on resize,
  never per move.
- **Input.** Touch is ignored (`pointerType`); on devices where nothing can
  hover (`any-hover: none`) the field stays flat. Keyboard focus
  (`:focus-visible`) drives the same field and the preview, so the effect is
  not mouse-only.
- **Reduced motion.** The field snaps instead of easing, the sine is static, the
  preview fades without gliding.
- **Accessibility.** A `<nav>` landmark (`ariaLabel`) with real links or
  buttons; `aria-current="page"` on the current row; the rail and the preview
  card are `aria-hidden`.
- **Sound.** With `sound`, `tick` plays when a mouse or pen moves onto a new
  row (not a disabled one) and `select` when an item that is not already
  current is activated.

## Theming

| Variable         | Default               | Role                                     |
| ---------------- | --------------------- | ---------------------------------------- |
| `--tn-accent`    | `var(--ft-accent, …)` | Lit bars, sine, current label            |
| `--tn-muted`     | `currentColor` at 28% | Resting bars                             |
| `--tn-row-h`     | `2.25rem`             | Row height (also spaces the minor ticks) |
| `--tn-bar-w`     | `1.75rem`             | Resting main bar                         |
| `--tn-current-w` | `3.25rem`             | Current row's bar                        |
| `--tn-minor-w`   | `0.875rem`            | Resting minor tick                       |
| `--tn-gap`       | `0.75rem`             | Space between a bar's tip and its label  |
