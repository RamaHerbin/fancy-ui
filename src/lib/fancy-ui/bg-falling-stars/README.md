# FallingStarsBg

Canvas-based 3D starfield background with perspective projection, motion trails, and glow effects.

## Props

| Prop    | Type     | Default  | Description           |
|---------|----------|----------|-----------------------|
| `color` | `string` | `"currentColor"` | Star color: a hex string, or `currentColor` to follow the text colour |
| `count` | `number` | `200`    | Number of stars       |
| `class` | `string` | `""`     | Additional CSS classes |

## Implementation Notes

- Canvas rendering with `requestAnimationFrame` loop — no CSS/SVG animations.
- 3D perspective: stars move toward camera with depth-based scaling (`perspective / (perspective + z)`).
- Motion trails: lines drawn from previous to current projected position.
- Glow layers: multiple strokes with decreasing opacity (`[0.08, 0.14, 0.22]`) plus a sharp center line and dot.
- HiDPI: uses `devicePixelRatio` for crisp rendering on Retina displays.
- Uses `ResizeObserver` instead of window resize listener for better responsiveness.
- The colour is resolved once per frame: a hex value is parsed once, `currentColor` is re-read from the canvas's computed text colour so a light/dark switch lands on the next frame.
- Cleanup: animation frame and resize observer are cleaned up on unmount via `onMount` return.

## Reduced motion

With `prefers-reduced-motion: reduce` the stars stop flying: the canvas paints one still frame of the starfield and no animation frame is scheduled. A `color` change still repaints that frame, and clearing the preference resumes the flight.
