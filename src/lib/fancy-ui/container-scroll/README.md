# ContainerScroll

A scroll-driven animation container that rotates and scales a card from a tilted perspective to flat as the user scrolls.

## Props

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `""`    | Additional CSS classes |

## Snippets

- `titleContent` — Title section (translates up on scroll)
- `cardContent` — Card content (rotates and scales on scroll)

## Usage

```svelte
<ContainerScroll>
	{#snippet titleContent()}
		<h2 class="text-4xl font-bold">Scroll Animation</h2>
		<p class="text-muted-foreground">Scroll down to see the effect</p>
	{/snippet}
	{#snippet cardContent()}
		<img src="/screenshot.png" alt="Demo" class="size-full object-cover" />
	{/snippet}
</ContainerScroll>
```
