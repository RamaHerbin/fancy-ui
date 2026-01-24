# StarsBackground

Animated starfield background with parallax mouse tracking.

## Porting Notes

- **Motion library**: Replaced `motion-v` with CSS animations and manual spring physics
- **Stars**: Generated using box-shadow technique (1000 + 400 + 200 stars across 3 layers)
- **Parallax**: Mouse movement creates depth effect via spring interpolation

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `factor` | `number` | `0.05` | Parallax factor for mouse movement |
| `speed` | `number` | `50` | Base animation speed in seconds |
| `stiffness` | `number` | `50` | Spring stiffness for parallax |
| `damping` | `number` | `20` | Spring damping for parallax |
| `starColor` | `string` | `#fff` | Color of the stars |
| `class` | `string` | - | Additional CSS classes |
| `children` | `Snippet` | - | Content to render over stars |

## Usage

```svelte
<script>
  import { StarsBackground } from '$lib/fancy-ui/bg-stars';
</script>

<StarsBackground class="h-screen">
  <div class="relative z-10 flex items-center justify-center h-full">
    <h1 class="text-4xl text-white">Hello Stars</h1>
  </div>
</StarsBackground>
```

## Differences from Vue

- Spring transition options (`stiffness`, `damping`) are separate props instead of a config object
- Uses CSS `@keyframes` instead of motion-v for the scroll animation
- Manual spring physics implementation via `requestAnimationFrame`
