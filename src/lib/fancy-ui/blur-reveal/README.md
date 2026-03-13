# BlurReveal

A scroll-triggered reveal animation that transitions children from blurred and offset to clear and in-place, with staggered delays.

## Features

- **Scroll trigger**: Animates when the element enters the viewport via IntersectionObserver
- **Staggered children**: Each direct child animates sequentially with a configurable delay
- **Customizable blur**: Control blur amount, Y offset, duration, and stagger delay
- **Reduced motion**: Respects `prefers-reduced-motion`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `duration` | `number` | `1` | Animation duration in seconds |
| `delay` | `number` | `0.2` | Stagger delay between children in seconds |
| `blur` | `string` | `'20px'` | Initial blur amount (CSS value) |
| `yOffset` | `number` | `20` | Initial vertical offset in pixels |
| `class` | `string` | `''` | Additional CSS classes for the container |

## Usage

```svelte
<script>
  import { BlurReveal } from '$lib/fancy-ui/blur-reveal';
</script>

<BlurReveal>
  <h1>This fades in first</h1>
  <p>This fades in second</p>
  <p>This fades in third</p>
</BlurReveal>
```

## Implementation Notes

- Replaced `motion-v` with IntersectionObserver + CSS transitions
- The reference design iterates VNodes from `slots.default()` to wrap each in a `Motion` component; this Svelte version applies stagger via `:nth-child` CSS selectors on direct children
- Default `delay` changed from `2` to `0.2` — the original value was a multiplier used differently by motion-v
- Supports up to 10 staggered children via CSS; beyond that, extra children animate with the same delay as the 10th
