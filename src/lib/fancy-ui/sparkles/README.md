# Sparkles

Canvas-based floating particle sparkle effect.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `background` | `string` | `'#0d47a1'` | Background color |
| `particleColor` | `string` | `'#ffffff'` | Particle color: a hex string, or `currentColor` to follow the text colour |
| `minSize` | `number` | `1` | Minimum particle size |
| `maxSize` | `number` | `3` | Maximum particle size |
| `speed` | `number` | `4` | Particle movement speed |
| `particleDensity` | `number` | `120` | Number of particles |
| `class` | `string` | `''` | Additional CSS classes |

## Reduced motion

With `prefers-reduced-motion: reduce` the particles stop drifting and pulsing: the canvas paints one still frame of the field and no animation frame is scheduled. A `particleColor` change still repaints that frame, and clearing the preference resumes the drift.
