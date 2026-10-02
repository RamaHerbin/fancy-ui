# Bento Grid

Bento-style grid of framed tiles for features, dashboards and content cards.

## The look

Every tile is a nested double frame: an outer hairline frame (`#0f0f10` in dark, `#f6f6f7` in light) holding an inner panel with its own hairline and a soft top light. Shadows stay ambient. On hover (or when focus lands inside), an accent glow with a white-hot core rises from the bottom of the panel, the bottom edge lights up, the content lifts 6px, the icon's inset tile brightens, and a card's CTA slides in from the left.

The first time the grid scrolls into view, the tiles fade up in a short stagger (70ms per tile, capped at 420ms in total).

## Components

- **BentoGrid**: grid container with responsive columns, the scroll reveal and the accent colour.
- **BentoGridItem**: slot-based tile with header, icon, title and description snippets. The icon and title share a row.
- **BentoGridCard**: props-based tile with name, description, a CTA link, and optional icon and background snippets.

## Props

### BentoGrid

| Prop     | Type      | Default     | Description                                                                                               |
| -------- | --------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `class`  | `string`  | `''`        | Additional grid classes                                                                                   |
| `reveal` | `boolean` | `true`      | Tiles fade up in a stagger the first time the grid enters the viewport                                    |
| `accent` | `string`  | `undefined` | Any CSS colour for the hover glow, the lit edge, the icon ring and the CTA arrow. Writes `--bento-accent` |

### BentoGridItem

| Prop          | Type      | Default | Description        |
| ------------- | --------- | ------- | ------------------ |
| `class`       | `string`  | `''`    | Additional classes |
| `header`      | `Snippet` | —       | Header area slot   |
| `icon`        | `Snippet` | —       | Icon slot          |
| `title`       | `Snippet` | —       | Title slot         |
| `description` | `Snippet` | —       | Description slot   |

### BentoGridCard

| Prop          | Type      | Default | Description             |
| ------------- | --------- | ------- | ----------------------- |
| `name`        | `string`  | —       | Card title              |
| `description` | `string`  | —       | Card description        |
| `href`        | `string`  | —       | CTA link URL            |
| `cta`         | `string`  | —       | CTA link text           |
| `class`       | `string`  | `''`    | Additional classes      |
| `icon`        | `Snippet` | —       | Icon snippet            |
| `background`  | `Snippet` | —       | Background overlay slot |

## Theming

The accent falls back to a soft periwinkle (`#8e9cff`). Set `--bento-accent` on any ancestor, or pass `accent`, to change it. The surfaces can be themed with `--bento-frame-bg`, `--bento-frame-line`, `--bento-frame-line-hover`, `--bento-panel-bg` and `--bento-panel-line`.

Each direct child of the grid receives `--bento-i` (its index) and `--bento-delay` (its reveal delay) as inline custom properties.

## Reduced motion

With `prefers-reduced-motion: reduce`, the tiles are visible straight away with no reveal. Hover changes colour and opacity only: the glow fades in where it rests, the CTA fades without sliding, and nothing lifts. Browsers without scripting also get the grid fully visible. Keyboard focus that lands inside a grid still waiting to reveal shows it at once.

On touch screens (no hover), the CTA is always visible.

## Usage

```svelte
<BentoGrid accent="#a78bfa">
	<BentoGridItem class="md:col-span-2">
		{#snippet header()}<div
				class="min-h-24 flex-1 rounded-lg border border-black/5 dark:border-white/5"
			/>{/snippet}
		{#snippet icon()}<Activity />{/snippet}
		{#snippet title()}Feature{/snippet}
		{#snippet description()}Description here.{/snippet}
	</BentoGridItem>
</BentoGrid>
```
