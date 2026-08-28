<!--
	Test-only harness: real `{#snippet}` blocks written in an actual .svelte
	template, compiled the normal way. That is the thing StickyScroll.test.ts
	needs that hand-built `createRawSnippet` calls passed straight into
	`render()`'s props object cannot provide: `render()` is a plain generic
	function, not a template position, so it has no way to infer the
	component's own `generics="T"` from a props object built outside any
	template — TypeScript's generic-component inference for `<StickyScroll
	items={...}>` only fires at an actual call site (the same mechanism that
	infers generic JSX components), which means a real .svelte template. This
	harness is that call site — `it`/`i`/`active` in the snippets below are
	inferred as `Item`/`number`/`boolean` from `items`, with no manual
	annotation, and it doubles as proof the `generics="T"` signature compiles
	against a real consumer, not just a same-file recursive reference.

	`bind:activeIndex` is echoed into the DOM because `bind:` cannot be
	expressed from a `.ts` test file — this is the only way to prove the bound
	value itself (not just its downstream `data-active` effect) travels back
	out to the consumer.

	Not exported from index.ts, and not collected by Vitest directly (the run
	includes `*.test.ts` only) — imported and rendered from StickyScroll.test.ts.
-->
<script lang="ts">
	import StickyScroll from "./StickyScroll.svelte";
	import type { StickyScrollProps } from "./StickyScroll.svelte";

	interface Item {
		id: string;
		label: string;
	}

	type HarnessProps = Partial<
		Pick<
			StickyScrollProps<Item>,
			"panelSide" | "crossfade" | "panelClass" | "panelHidden" | "onChange" | "class"
		>
	> & {
		items: Item[];
		activeIndex?: number;
	};

	let {
		items,
		activeIndex = $bindable(0),
		panelSide,
		crossfade,
		panelClass,
		panelHidden,
		onChange,
		class: className,
	}: HarnessProps = $props();
</script>

<StickyScroll
	{items}
	bind:activeIndex
	{panelSide}
	{crossfade}
	{panelClass}
	{panelHidden}
	{onChange}
	class={className}
>
	{#snippet item(it, i, active)}
		<span class="row" data-active={active}>{i}:{it.label}</span>
	{/snippet}
	{#snippet panel(it, i)}
		<div class="panel-content">panel {i}:{it.label}</div>
	{/snippet}
</StickyScroll>

<span data-testid="active-index">{activeIndex}</span>
