# FallingStarsBg

Canvas-based 3D starfield background with perspective projection, motion trails, and glow effects.

## Props

| Prop    | Type     | Default  | Description            |
| ------- | -------- | -------- | ---------------------- |
| `color` | `string` | `"#FFF"` | Star color (hex)       |
| `count` | `number` | `200`    | Number of stars        |
| `class` | `string` | `""`     | Additional CSS classes |

## Implementation Notes

- Canvas rendering with `requestAnimationFrame` loop — no CSS/SVG animations.
- 3D perspective: stars move toward camera with depth-based scaling (`perspective / (perspective + z)`).
- Motion trails: lines drawn from previous to current projected position.
- Glow layers: multiple strokes with decreasing opacity (`[0.08, 0.14, 0.22]`) plus a sharp center line and dot.
- HiDPI: uses `devicePixelRatio` for crisp rendering on Retina displays.
- Uses `ResizeObserver` instead of window resize listener for better responsiveness.
- `$derived` used for cached RGB conversion so it updates reactively when `color` prop changes.
- Cleanup: animation frame and resize observer are cleaned up on unmount via `onMount` return.
