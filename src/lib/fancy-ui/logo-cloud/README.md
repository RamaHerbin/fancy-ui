# LogoCloud

Logo display components in three variants: animated marquee, static grid, and compact icon grid.

## Usage

```svelte
<script lang="ts">
  import { AnimatedLogoCloud, StaticLogoCloud, IconLogoCloud } from '$lib/fancy-ui/logo-cloud';

  const logos = [
    { name: 'Vercel', path: '/logos/vercel.svg' },
    { name: 'Next.js', path: '/logos/nextjs.svg' },
  ];
</script>

<AnimatedLogoCloud title="Trusted by" {logos} />
<StaticLogoCloud title="Our Partners" {logos} />
<IconLogoCloud title="Built with" {logos} />
```

## Variants

| Component | Description |
|-----------|-------------|
| `AnimatedLogoCloud` | Infinite horizontal scroll with fade mask |
| `StaticLogoCloud` | Responsive grid layout |
| `IconLogoCloud` | Compact icon-sized grid |

## Props (shared)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | - | Classes on the container |
| `title` | `string` | - | Optional heading text |
| `logos` | `Logo[]` | `[]` | Array of `{ name, path }` objects |

## Porting Notes

- Images use `brightness-0 dark:invert` for monochrome display that adapts to theme
- Animated variant duplicates logos 5x for seamless infinite scroll
