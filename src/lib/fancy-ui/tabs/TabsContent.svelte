<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface TabsContentProps {
		/** Which `TabsTrigger` shows this panel. */
		value: string;
		/**
		 * Keeps this panel mounted in the DOM (with the `hidden` attribute)
		 * even while inactive, instead of the default of unmounting it
		 * entirely. Needed for content — an iframe, a video, a form with
		 * uncommitted input — that must not remount every time the user tabs
		 * away and back.
		 */
		forceMount?: boolean;
		/** The panel's content. */
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

	let {
		value,
		forceMount = false,
		children,
		class: className,
		ref = $bindable(null),
	}: TabsContentProps = $props();

	// Undefined outside a Tabs root: nothing is ever "selected", so this
	// panel only renders when `forceMount` is set, matching the graceful
	// degradation every other compound piece in this library falls back to.
	const context = getContext<TabsContext | undefined>(TABS_KEY);
	const isSelected = $derived(context?.isSelected(value) ?? false);
</script>

{#if isSelected || forceMount}
	<div
		bind:this={ref}
		id={context?.panelId(value)}
		role="tabpanel"
		aria-labelledby={context?.triggerId(value)}
		tabindex="0"
		hidden={!isSelected}
		class={cn("ft-tabs-content", className)}
	>
		{#if children}
			{@render children()}
		{/if}
	</div>
{/if}
