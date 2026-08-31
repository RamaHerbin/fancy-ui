# GradientButton

## Sound

Set `sound` to play the `press` cue on activation, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<GradientButton sound onclick={() => save()}>Save</GradientButton>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). A `disabled` button blocks the cue exactly like it blocks a native click.

## Implementation Details

- Uses a real `<span>` element instead of `::before` pseudo-element for the rotating gradient (avoids scoped style issues with pseudo-elements in Svelte)
- CSS variables set via inline `style` attribute instead of Vue's `v-bind()` in `<style>`
- Props use `$props()` with Svelte 5 syntax
- Uses `{@render children?.()}` for slot content
- Spreads `...restProps` for native button attributes
- `aria-hidden="true"` on the decorative gradient span
