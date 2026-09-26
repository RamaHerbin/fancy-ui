# GradientButton

A dark button with a beam of light travelling around its border. The beam is a short arc carrying every colour of `colors`, followed by a fainter echo on the opposite side, and it casts a soft coloured glow into the face as it passes. Hovering or focusing the button brightens the glow.

```svelte
<GradientButton>Deploy</GradientButton>
<GradientButton colors={["#3b82f6", "#8b5cf6"]} duration={4000}
	>Slower, blue to violet</GradientButton
>
```

## Sound

Set `sound` to play the `press` cue on activation, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<GradientButton sound onclick={() => save()}>Save</GradientButton>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). A `disabled` button blocks the cue exactly like it blocks a native click.

## Implementation Details

- **Beam**: `beamGradient(colors)` (exported from the component module) builds one `conic-gradient(from var(--gb-angle), …)` — a main arc over ~42% of the turn with every colour at full strength, and an echo over 50–78% at 45% strength — passed in as `--gb-beam`. The button animates the registered `@property --gb-angle` from 0 to 360deg over `duration`.
- **Layers**: `.gradient-content` is the face (inset by `borderWidth`, a faint top highlight over `bgColor`) and holds the label. `.gradient-border` draws the beam on the border: the gradient masked to a `borderWidth` padding ring (`mask` content-box + `mask-composite: exclude`). `.gradient-glow` is the same gradient on a wider ring (`blur` × 1.75), blurred by its parent wrapper so the blur applies after the mask and falls off softly into the face, with `mix-blend-mode: screen` so it only lights.
- The button's own background (a lighter mix of `bgColor`) shows through the ring where the beam isn't, as a hairline border.
- `prefers-reduced-motion`: the beam stops at a fixed angle. Disabled: 50% opacity, beam paused.
- The CSS variables (`--gb-colors`, `--gb-duration`, `--gb-border-width`, `--gb-border-radius`, `--gb-blur`, `--gb-bg-color`) are still set inline.
