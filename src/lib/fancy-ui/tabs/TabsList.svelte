<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface TabsListProps {
		/** The `TabsTrigger`s. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { TABS_KEY, type TabsContext } from "./types.js";

	let { children, class: className, ref = $bindable(null) }: TabsListProps = $props();

	// Undefined outside a Tabs root: orientation/variant then fall back to
	// this component's own defaults rather than throwing, matching every
	// other compound in this library.
	const context = getContext<TabsContext | undefined>(TABS_KEY);
	const orientation = $derived(context?.orientation ?? "horizontal");
	const variant = $derived(context?.variant ?? "underline");

	const classes = $derived(
		cn(
			"ft-tabs-list inline-flex",
			orientation === "vertical" ? "flex-col" : "flex-row",
			variant === "underline"
				? cn("border-border", orientation === "vertical" ? "border-r" : "border-b")
				: "ft-tabs-list-segmented bg-background border-border w-fit border",
			className
		)
	);
</script>

<!--
	role="tablist" needs no accessible name of its own per the WAI-ARIA Tabs
	pattern unless a page has more than one — a consumer with several tab
	groups on screen at once can still add one through `class` plus their own
	`aria-label` via a wrapping element, or by giving each Tabs root a
	distinct heading before it.
-->
<div
	bind:this={ref}
	role="tablist"
	aria-orientation={orientation === "vertical" ? "vertical" : undefined}
	data-orientation={orientation}
	data-variant={variant}
	class={classes}
>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	/*
	 * Exact rail padding/gap/radius from the mockup — not expressible as a
	 * single Tailwind utility. Same `bg-background` reasoning as
	 * ToggleGroup's rail: this app's dark theme has `--muted` *lighter* than
	 * `--card`, so a muted fill on a card-nested rail would read as raised,
	 * the opposite of the mockup's recessed strip.
	 */
	.ft-tabs-list-segmented {
		border-radius: 0.5rem; /* 8px */
		padding: 3px;
		gap: 2px;
	}
</style>
