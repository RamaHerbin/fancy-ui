# SmoothCursor

A customizable, physics-based smooth cursor animation component. The cursor follows mouse movement with spring physics, creating a natural, fluid feel. Includes rotation based on movement direction.

## Features

- Spring physics for smooth, natural cursor movement
- Configurable spring parameters (damping, stiffness, mass)
- Rotation based on movement direction
- Custom cursor support via Svelte snippets
- Auto-hides when mouse leaves the viewport
- Respects `prefers-reduced-motion`: disables spring physics and snaps directly to pointer
- Hides the native browser cursor automatically
- Performance optimized with `requestAnimationFrame` and `will-change`

## Implementation Notes

### Svelte 5 Implementation

1. **Spring physics**: Implemented manually using `requestAnimationFrame` instead of Framer Motion's `useSpring`
2. **Custom cursor**: Uses Svelte 5 snippets instead of JSX elements
3. **Lifecycle**: Uses `onMount` with a cleanup return for the reduced-motion media query and the engine teardown; the pointer listeners and the spring loop live in the framework-free core (`smooth-cursor-core.ts`)
4. **Props**: Uses Svelte 5 `$props()`; the spring config is merged with the defaults inside the core (`resolveConfig()`) and re-resolved every frame
