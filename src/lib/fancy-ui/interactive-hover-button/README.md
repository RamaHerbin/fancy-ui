# InteractiveHoverButton

Button with a hover animation: text slides out to the right while an arrow and duplicate text slide in from the right. A small `bg-primary` dot scales up to fill the button background.

## Props

| Prop       | Type     | Default    | Description                         |
| ---------- | -------- | ---------- | ----------------------------------- |
| `text`     | `string` | `"Button"` | Button label text                   |
| `class`    | `string` | `""`       | Additional CSS classes              |
| `children` | Snippet  | -          | Optional content (overrides `text`) |

Also accepts all standard `<button>` attributes via `...restProps`.

## Animation details

All animations are pure CSS via Tailwind `group-hover` utilities, no JS required:

- **Dot**: `scale-1` -> `scale-[100.8]` fills the button background with `bg-primary`
- **Initial text**: slides right (`translate-x-12`) and fades out (`opacity-0`)
- **Hover text + arrow**: slides in from right (`-translate-x-5`) and fades in (`opacity-100`)
- All transitions use `duration-300`

## Motion

- **Reduced motion.** Every `transition-*` utility is prefixed
  `motion-safe:`, which Tailwind compiles to
  `@media (prefers-reduced-motion: no-preference)`. The `group-hover:`
  transforms are deliberately left unprefixed: a visitor who asked for less
  motion still gets the whole hover state — the dot fills the button, the
  label swaps for the arrow — it simply arrives instead of travelling.
  Gating the transforms too would leave the button looking broken on hover
  rather than calm.
- **Touch and coarse pointers.** The effect is `:hover`-driven and purely
  decorative: the button's label is present and readable in both states, so
  a device that never fires hover loses nothing but the animation.

## Porting notes

- Direct port, no structural changes needed
- Inline SVG arrow (no Lucide dependency)
- Uses theme tokens: `bg-background`, `bg-primary`, `text-primary-foreground`
