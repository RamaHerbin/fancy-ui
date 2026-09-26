# ShimmerButton

A pill button with a satin sheen. Every cycle, a soft band of light crosses the face on a slight diagonal (a wide halo with a thinner, brighter core), lifts the label to full white as it passes, then rests. On hover the sweep hands over to a highlight that follows the pointer. A thin rim around the face catches the same light.

```svelte
<ShimmerButton>Get started</ShimmerButton>
<ShimmerButton background="rgba(20, 83, 45, 0.9)" shimmerColor="#86efac">Green</ShimmerButton>
```

## Sound

Set `sound` to play the `press` cue on activation, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<ShimmerButton sound onclick={() => save()}>Save</ShimmerButton>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). A `disabled` button blocks the cue exactly like it blocks a native click.

## Implementation Details

- **Layers**, all `aria-hidden` spans: `__rim` (the button's full box, a vertical `shimmerColor` gradient), `__face` (inset by `shimmerSize`, so the rim shows around it; `background` plus a faint top-down tint and a soft bottom inner glow), the label, `__sheen` (the sweep) and `__spot` (the hover highlight).
- **Sweep**: two stacked `linear-gradient`s at 108° on a 250% wide background, moved by `background-position` over the first 55% of `shimmerDuration`, then resting off the button until the next cycle. `mix-blend-mode: screen`, so it lightens the face and the label but never darkens anything.
- **Hover**: `pointermove` writes `--mx` / `--my` on the button (no re-render); `__spot` is a radial gradient at that point. The sweep fades out while hovered, so the two never stack. A consumer `onpointermove` is still called.
- Colours come from `shimmerColor` through `color-mix()`, so any colour tints the rim, face, sweep and spot consistently.
- `prefers-reduced-motion`: no sweep; a faint static sheen stays on the face. The hover highlight still follows the pointer (it is driven by the user, not by time).
- Disabled: 50% opacity, no sheen, `not-allowed` cursor.
- Spreads `...restProps` for native button attributes; `onclick` is forwarded after the sound cue.
