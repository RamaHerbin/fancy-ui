<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		columns?: string;
		gap?: string;
		class?: string;
		children?: Snippet;
	}

	let { columns = "3", gap = "gap-6", class: className = "", children }: Props = $props();

	const colsClass: Record<string, string> = {
		"1": "grid-cols-1",
		"2": "grid-cols-1 md:grid-cols-2",
		"3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
		"4": "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
	};

	let gridCols = $derived(colsClass[columns] ?? colsClass["3"]);
</script>

<div class={cn("grid", gridCols, gap, className)}>
	{#if children}
		{@render children()}
	{/if}
</div>
