# ShimmerButton

## Implementation Details

- Pure CSS animation, no JS state needed
- Props use `$props()` with Svelte 5 syntax
- Scoped keyframes (`shimmer-slide`, `spin-around`) via `<style>` block
- CSS variables set via inline `style` attribute
- Uses `{@render children?.()}` for slot content
- Spreads `...restProps` for native button attributes
