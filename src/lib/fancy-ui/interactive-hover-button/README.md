# InteractiveHoverButton

Button with a hover animation: text slides out to the right while an arrow and duplicate text slide in from the right. A small `bg-primary` dot scales up to fill the button background.

## Props

| Prop       | Type      | Default    | Description                                                          |
| ---------- | --------- | ---------- | -------------------------------------------------------------------- |
| `text`     | `string`  | `"Button"` | Button label text                                                    |
| `class`    | `string`  | `""`       | Additional CSS classes                                               |
| `children` | Snippet   | -          | Optional content (overrides `text`)                                  |
| `sound`    | `boolean` | `false`    | Plays the `press` cue on activation, once the user has enabled sound |

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

## Sound

Set `sound` to play the `press` cue on activation, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<InteractiveHoverButton sound onclick={() => go()}>Get started</InteractiveHoverButton>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). `disabled` blocks the cue exactly like it blocks a native click. The hover reveal itself stays silent — the cue plays on activation only, never on hover.

## Porting notes

- Direct port, no structural changes needed
- Inline SVG arrow (no Lucide dependency)
- Uses theme tokens: `bg-background`, `bg-primary`, `text-primary-foreground`
