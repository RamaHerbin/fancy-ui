<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { SourceData } from "../_internals/ai-types.js";

	/**
	 * Props for Sources
	 */
	export interface SourcesProps {
		/** The documents backing the answer, in the order they should be read. */
		sources: SourceData[];
		/** Whether the list is expanded. Bindable; starts closed. */
		open?: boolean;
		/** Called whenever the list opens or closes. */
		onToggle?: (open: boolean) => void;
		/** Replaces the default trigger-and-list composition entirely. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { setContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import SourcesTrigger from "./SourcesTrigger.svelte";
	import SourcesList from "./SourcesList.svelte";
	import { SOURCES_CONTEXT_KEY, type SourcesContext } from "./types.js";

	let {
		sources,
		open = $bindable(false),
		onToggle,
		children,
		class: className,
		ref = $bindable(null),
	}: SourcesProps = $props();

	const uid = $props.id();
	const listId = `${uid}-list`;

	// Getters throughout: a part reading any of these inside its own reactive
	// scope re-runs when the root's props change, without the object being
	// rebuilt and re-published on every keystroke upstream.
	const context: SourcesContext = {
		open: {
			get current() {
				return open;
			},
		},
		get count() {
			return sources.length;
		},
		get sources() {
			return sources;
		},
		listId,
		toggle() {
			open = !open;
			onToggle?.(open);
		},
	};

	setContext(SOURCES_CONTEXT_KEY, context);
</script>

<div bind:this={ref} class={cn("ft-sources w-full", className)} data-open={open}>
	{#if children}
		{@render children()}
	{:else}
		<SourcesTrigger />
		<SourcesList />
	{/if}
</div>
