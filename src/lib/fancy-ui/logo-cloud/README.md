# LogoCloud

Logo display components in three variants: animated marquee, static grid, and compact icon grid.

## Usage

```svelte
<script lang="ts">
	import { AnimatedLogoCloud, StaticLogoCloud, IconLogoCloud } from "$lib/fancy-ui/logo-cloud";

	const logos = [
		{ name: "Vercel", path: "/logos/vercel.svg" },
		{ name: "Next.js", path: "/logos/nextjs.svg" },
	];
</script>

<AnimatedLogoCloud title="Trusted by" {logos} />
<StaticLogoCloud title="Our Partners" {logos} />
<IconLogoCloud title="Built with" {logos} />
```

## Variants

| Component           | Description                               |
| ------------------- | ----------------------------------------- |
| `AnimatedLogoCloud` | Infinite horizontal scroll with fade mask |
| `StaticLogoCloud`   | Responsive grid layout                    |
| `IconLogoCloud`     | Compact icon-sized grid                   |

## Props (shared)

| Prop        | Type         | Default | Description                                                                        |
| ----------- | ------------ | ------- | ---------------------------------------------------------------------------------- |
| `class`     | `string`     | -       | Classes on the container                                                           |
| `title`     | `string`     | -       | Optional heading text                                                              |
| `logos`     | `Logo[]`     | `[]`    | Array of `{ name, path }` objects                                                  |
| `wordmarks` | `Wordmark[]` | -       | `StaticLogoCloud` only — static typographic row instead of image logos (see below) |

## Wordmarks (StaticLogoCloud only)

Pass `wordmarks` instead of `logos` to render brand names as styled text rather than images — no logo assets needed:

```svelte
<script lang="ts">
	import { StaticLogoCloud } from "$lib/fancy-ui/logo-cloud";
	import type { Wordmark } from "$lib/fancy-ui/logo-cloud";

	const wordmarks: Wordmark[] = [
		{ name: "Acme Corp", size: 22, weight: 700 },
		{ name: "Nimbus Labs", size: 20, weight: 400, italic: true },
		{ name: "FOUNDRY", size: 18, weight: 900, tracking: 2, transform: "uppercase" },
	];
</script>

<StaticLogoCloud title="Our partners" {wordmarks} />
```

| `Wordmark` field | Type                         | Description                                                               |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------- |
| `name`           | `string`                     | The brand/wordmark text                                                   |
| `size`           | `number`                     | Font size in pixels                                                       |
| `weight`         | `400 \| 700 \| 900`          | Font weight                                                               |
| `tracking`       | `number`                     | Letter-spacing in pixels                                                  |
| `italic`         | `boolean`                    | Render in italic                                                          |
| `serif`          | `boolean`                    | Use `Georgia, "Times New Roman", serif` instead of the default font stack |
| `transform`      | `'uppercase' \| 'lowercase'` | CSS `text-transform`                                                      |

Each mark renders at `opacity: .85`. When `wordmarks` is provided, `logos` is ignored.

## Implementation Notes

- Images use `brightness-0 dark:invert` for monochrome display that adapts to theme
- Animated variant duplicates logos 5x for seamless infinite scroll
- `wordmarks` is only read by `StaticLogoCloud`; `AnimatedLogoCloud` and `IconLogoCloud` remain image-only
