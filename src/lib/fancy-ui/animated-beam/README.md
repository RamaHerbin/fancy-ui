# AnimatedBeam

Built from FancyUI's AnimatedBeam component.

## Overview
Creates animated SVG beams that connect two elements with smooth gradients and customizable curves. Perfect for showing data flow, connections, or relationships between UI elements.

## Key Features
- Dynamic path calculation between elements
- Responsive to container resizing
- Customizable curvature for curved beams
- Animated gradient effect
- Configurable colors, opacity, and timing
- Reversible animation direction
- Position offsets for fine-tuning

## Implementation Notes

### Vue → Svelte Conversions
- `ref()` → `$state()`
- `computed()` → `$derived()`
- `watchEffect()` → `$effect()` (via `onMount`)
- Template refs → `bind:this`
- Props handling with destructuring defaults

### Key Differences
1. **Element References**: Svelte uses `bind:this` instead of Vue's `ref` template attribute
2. **Lifecycle**: Setup logic moved to `onMount` with cleanup return
3. **Derived Values**: Functions returning derived values (x1, x2, y1, y2) instead of computed refs
4. **Conditional Rendering**: Used `{#if}` blocks to ensure refs are defined before rendering beams

### Implementation Details
- ResizeObserver for responsive path updates
- SVG path calculation using quadratic Bezier curves (Q command)
- Direction detection for vertical/horizontal beams
- Unique gradient IDs to prevent conflicts with multiple instances

## Demo
See `/demo/animated-beam` for usage examples.

