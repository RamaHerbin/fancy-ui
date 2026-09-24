# InteractiveHoverButton

Button with a hover animation. A small dot beside the label opens into a circle that fills the button; the resting label rolls up and out with a slight blur, and the hover label rolls up into place with an arrow a beat behind it. Keyboard focus plays the same animation.

## Props

| Prop       | Type      | Default    | Description                                                          |
| ---------- | --------- | ---------- | -------------------------------------------------------------------- |
| `text`     | `string`  | `"Button"` | Button label text                                                    |
| `class`    | `string`  | `""`       | Additional CSS classes                                               |
| `children` | Snippet   | -          | Optional content (overrides `text`)                                  |
| `sound`    | `boolean` | `false`    | Plays the `press` cue on activation, once the user has enabled sound |

Also accepts all standard `<button>` attributes via `...restProps`.

## Animation details

Pure CSS, in the component's `<style>` block (no JS):

- **Dot and fill** are one layer, `.ihb-fill`: a full-size background in `--ihb-fill`, clipped to `circle(4px at var(--ihb-dot-x) 50%)`. On hover or `:focus-visible` the circle opens to `circle(150% …)` over 600 ms, so the dot itself becomes the fill and stays crisp at every size.
- **Resting label** (`.ihb-rest`, with an 8 px `.ihb-dot-space` for the dot) rolls up to `translateY(-70%)` with a 4 px blur and fades out.
- **Hover label** (`.ihb-hover`, `aria-hidden`) rolls up from `translateY(70%)` 60 ms later, in `--ihb-fill-foreground`; its **arrow** slides in from the left 160 ms after the fill starts.
- One easing throughout, `cubic-bezier(0.22, 1, 0.36, 1)` (a quick start, a long soft landing). The delays apply only on the way in, so leaving reverses at once. Pressing scales the button to 0.97.

## Colours

The fill defaults to the theme's primary colour (`--primary`, then `--color-primary`) and the hover label to its foreground. Override both from `class`:

```svelte
<InteractiveHoverButton text="Delete" class="[--ihb-fill-foreground:#fff] [--ihb-fill:#ef4444]" />
```

## Motion

- **Reduced motion.** Every transition sits inside
  `@media (prefers-reduced-motion: no-preference)`. The hover state itself is
  not gated: a visitor who asked for less motion still gets it — the button
  fills, the label swaps for the arrow — it simply arrives instead of
  travelling. Gating the state too would leave the button looking broken on
  hover rather than calm.
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
- Uses theme tokens: `bg-background` for the face, `--primary` / `--primary-foreground` for the fill and hover label
