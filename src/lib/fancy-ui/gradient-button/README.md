# GradientButton

## Changes from Vue version

- Uses a real `<span>` element instead of `::before` pseudo-element for the rotating gradient (avoids scoped style issues with pseudo-elements in Svelte)
- CSS variables set via inline `style` attribute instead of Vue's `v-bind()` in `<style>`
- Props use `$props()` with Svelte 5 syntax
- Uses `{@render children?.()}` for slot content
- Spreads `...restProps` for native button attributes
- `aria-hidden="true"` on the decorative gradient span
