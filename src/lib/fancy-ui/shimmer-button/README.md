# ShimmerButton

## Sound

Set `sound` to play the `press` cue on activation, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<ShimmerButton sound onclick={() => save()}>Save</ShimmerButton>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). A `disabled` button blocks the cue exactly like it blocks a native click.

## Implementation Details

- Pure CSS animation, no JS state needed
- Props use `$props()` with Svelte 5 syntax
- Scoped keyframes (`shimmer-slide`, `spin-around`) via `<style>` block
- CSS variables set via inline `style` attribute
- Uses `{@render children?.()}` for slot content
- Spreads `...restProps` for native button attributes
