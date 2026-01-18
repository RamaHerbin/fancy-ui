# FluidCursor

A WebGL-based fluid simulation that follows the cursor, creating beautiful flowing color effects.

## Features

- WebGL2 fluid simulation with WebGL1 fallback
- Mouse and touch support
- Configurable simulation parameters
- Transparent background support
- Automatic canvas resizing

## Implementation Notes

### Svelte 5 Implementation

1. **Lifecycle**: Used `onMount` with cleanup return instead of Vue's `onMounted` + `watch`
2. **Refs**: Used `bind:this` for canvas reference instead of Vue's `ref()`
3. **Props**: Used Svelte 5 `$props()` syntax with defaults
4. **Cleanup**: Properly cancel animation frame and remove event listeners on unmount

### WebGL Implementation

The component implements a full Navier-Stokes fluid simulation with:
- Curl/vorticity computation
- Pressure solving with iterative Jacobi method
- Advection for both velocity and dye
- Gradient subtraction for incompressible flow

### Event Handling

- Window-level mouse/touch events for full-screen tracking
- First-move handlers to start animation only when user interacts
- Proper cleanup of all event listeners on component unmount
