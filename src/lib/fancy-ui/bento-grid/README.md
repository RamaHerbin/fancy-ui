# Bento Grid

Bento-style grid layout for organizing features and content cards.

## Components

- **BentoGrid** — Grid container with responsive columns.
- **BentoGridItem** — Slot-based item with header, icon, title, and description snippets.
- **BentoGridCard** — Props-based card with name, description, CTA link, optional icon and background.

## Props

### BentoGrid

| Prop    | Type     | Default | Description             |
| ------- | -------- | ------- | ----------------------- |
| `class` | `string` | `''`    | Additional grid classes |

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
| `cta`         | `string`  | —       | CTA button text         |
| `class`       | `string`  | `''`    | Additional classes      |
| `icon`        | `Snippet` | —       | Icon snippet            |
| `background`  | `Snippet` | —       | Background overlay slot |

## Usage

```svelte
<BentoGrid>
	<BentoGridItem class="md:col-span-2">
		{#snippet header()}<div
				class="h-full rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500"
			/>{/snippet}
		{#snippet title()}Feature{/snippet}
		{#snippet description()}Description here.{/snippet}
	</BentoGridItem>
</BentoGrid>
```
