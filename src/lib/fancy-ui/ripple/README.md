# Ripple

Concentric pulsing circles with a ripple wave animation.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `baseCircleSize` | `number` | `210` | Size of the innermost circle (px) |
| `baseCircleOpacity` | `number` | `0.24` | Opacity of the innermost circle |
| `spaceBetweenCircle` | `number` | `70` | Size increment between circles |
| `circleOpacityDowngradeRatio` | `number` | `0.03` | Opacity decrease per circle |
| `circleClass` | `string` | `''` | CSS classes for each circle |
| `waveSpeed` | `number` | `80` | Animation delay between circles (ms) |
| `numberOfCircles` | `number` | `7` | Number of circles |
| `class` | `string` | `''` | Additional CSS classes |

## Reduced motion

With `prefers-reduced-motion: reduce` the rings stay still at full size, with the same spacing and fading opacity. Without a reduce preference they pulse as before.
