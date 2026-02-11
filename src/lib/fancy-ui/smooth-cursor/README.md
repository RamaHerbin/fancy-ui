# SmoothCursor

A customizable, physics-based smooth cursor animation component. The cursor follows mouse movement with spring physics, creating a natural, fluid feel. Includes rotation based on movement direction.

## Features

- Spring physics for smooth, natural cursor movement
- Configurable spring parameters (damping, stiffness, mass)
- Rotation based on movement direction
- Custom cursor support via Svelte snippets
- Auto-hides when mouse leaves the viewport
- Performance optimized with `requestAnimationFrame` and `will-change`

## Porting Notes

### Key Changes from Vue/React

1. **Spring physics**: Implemented manually using `requestAnimationFrame` instead of Framer Motion's `useSpring`
2. **Custom cursor**: Uses Svelte 5 snippets instead of JSX elements
3. **Lifecycle**: Uses `onMount` with cleanup return for event listener management
4. **Props**: Uses Svelte 5 `$props()` with `$derived()` for merged config
