# DimSiblings

Wrap a group of cards, links, or list items, and hovering or keyboard-focusing one dims (or blurs) every other one — a pure CSS `:has()` affordance that draws the eye to whichever item the reader is actually on, with zero pointer-tracking JavaScript.

## Usage

```svelte
<script>
	import { DimSiblings } from "fancy-ui-svelte";
</script>

<DimSiblings class="grid grid-cols-4 gap-6">
	<a href="/product">Product</a>
	<a href="/docs">Docs</a>
	<a href="/pricing">Pricing</a>
	<a href="/blog">Blog</a>
</DimSiblings>
```

Every direct child of `DimSiblings` participates — hovering or focusing any one of them dims (or blurs) the rest. Use `as="ul"` when the children are `<li>`s and the list's own semantics need to survive the wrapper:

```svelte
<DimSiblings as="ul" effect="blur" class="grid grid-cols-3 gap-4">
	{#each cards as card}
		<li><Card {...card} /></li>
	{/each}
</DimSiblings>
```

## Props

| Prop       | Type                          | Default | Description                                                                                                |
| ---------- | ----------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `effect`   | `"dim" \| "blur" \| "both"`   | `"dim"` | Which visual property the non-active siblings lose.                                                        |
| `opacity`  | `number`                      | `0.4`   | Opacity the non-active siblings settle to — a floor, not zero.                                             |
| `blur`     | `number` (px)                 | `2`     | Blur radius applied only when `effect` includes blur.                                                      |
| `duration` | `number` (ms)                 | `150`   | Transition duration for the opacity/blur change.                                                           |
| `as`       | `keyof HTMLElementTagNameMap` | `"div"` | The rendered root element — `"ul"`/`"ol"` for a list whose CSS list semantics need to survive the wrapper. |
| `children` | `Snippet`                     | —       | The sibling group. Required — every direct child participates.                                             |
| `class`    | `string`                      | —       | Additional CSS classes.                                                                                    |
| `ref`      | `HTMLElement \| null`         | `null`  | Bindable reference to the root element.                                                                    |

Any other standard element attribute (`id`, `data-*`, `aria-*`, …) is passed through to the root.

## Theming

| CSS variable                | Default | Applies to                                                                                                                                                                                                                                                                                              |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ft-dimsiblings-opacity`  | `0.4`   | Opacity of non-active siblings. The `opacity` declaration itself only exists for `effect="dim"`/`"both"` (keyed on `data-effect`), so a blur-only group stays at full opacity; the var is written inline only when `opacity` differs from the default, so a stylesheet rule can still set it otherwise. |
| `--ft-dimsiblings-blur`     | `2px`   | Blur radius of non-active siblings. The `filter` declaration itself only exists for `effect="blur"`/`"both"` (keyed on `data-effect`), so a dim-only group never carries a filter layer; the var is still written inline (`0px` for `"dim"`) so a themer's global fallback can't leak blur in.          |
| `--ft-dimsiblings-duration` | `150ms` | Transition duration. Written inline only when `duration` differs from the default.                                                                                                                                                                                                                      |

## Motion

- **Reduced motion**: only the `transition` declaration is gated behind `@media (prefers-reduced-motion: no-preference)`. The dim/blur end states apply either way — with reduced motion they snap instantly instead of animating.
- **Touch and coarse pointers**: the hover branch is gated behind `@media (hover: hover)`, so nothing dims on a tap-only device and nothing gets stuck dimmed after a touch. The focus-visible branch is unconditional — it's the keyboard/touch equivalent that keeps working everywhere.
- **Focus wins over hover**: if a `:focus-visible` child and a `:hover` child are two different elements (tabbing to one item while the pointer still rests on another), the hover rule stands down — only the focus-visible rule applies. Without that precedence the two rules' targets would union and dim the entire group.
- **Timing**: 150ms, `--ft-ease-inout` (`cubic-bezier(0.4, 0, 0.2, 1)`).

## Accessibility

- Siblings are never given `aria-hidden` and never removed from the tab order — dimming (and blurring) is a purely visual affordance layered on top of normal DOM structure and focus order.
- The focus-visible rule uses `:focus-visible`, not `:focus-within` — a programmatic `.focus()` call or a mouse-click focus (neither of which shows a focus ring to a sighted user) does not dim the group.
- Don't rely on dimming alone to convey which item is "active" or selected — pair it with a real state indicator (`aria-current`, a selected style, etc.) for anyone who can't perceive the opacity/blur change.
- Contrast: dimmed siblings still need to clear a readable contrast ratio at the chosen `opacity` against your background — check contrast if you push the default `0.4` lower.
- In Windows High Contrast (`forced-colors: active`), and for anyone whose OS asks for increased contrast (`prefers-contrast: more`) or reduced transparency (`prefers-reduced-transparency: reduce`), the dim and blur are disabled entirely — every sibling renders at full opacity with no filter, regardless of hover or focus.

## Implementation notes

- **Cleanup**: none needed. DimSiblings has no JavaScript pointer tracking, listeners, or observers — every bit of the hover/focus behaviour is a `:has()` CSS rule.
- **SSR**: the root element and its CSS custom properties render identically on the server and the client; there is nothing browser-only to gate.
- **Blur cost**: `filter: blur()` is not free — its GPU compositing cost scales with sibling count and each blurred element's size. Prefer `effect="dim"` for lists longer than about a dozen items; save `blur`/`both` for small hero-style groups (3–6 items).
- **Transitions on every child**: DimSiblings puts a 150ms opacity/filter transition on every direct child (`.ft-dimsiblings > *`) so the dim/blur state animates smoothly. If a child runs its own opacity animation (a `Reveal`, a `Presence`, a Tailwind `animate-*` class), the two transitions compose on the same property.

## Browser support

DimSiblings' entire hover/focus behaviour depends on the CSS `:has()` relational pseudo-class, which reached Baseline "newly available" in December 2023 (Safari 15.4, Chrome/Edge 105, Firefox 121 — Firefox shipped last of the three evergreen browsers). On a browser without `:has()` support, the rule simply never matches: every sibling stays at full opacity, nothing blurs, nothing breaks — a silent, harmless degradation rather than a broken layout. There is no JavaScript fallback.
