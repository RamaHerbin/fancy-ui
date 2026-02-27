<script lang="ts">
	import { cn } from "$lib/utils";

	interface Props {
		items?: string[];
		ordered?: boolean;
		class?: string;
	}

	let {
		items = ["Item 1", "Item 2", "Item 3"],
		ordered = false,
		class: className = "",
	}: Props = $props();

	let safeItems = $derived(Array.isArray(items) ? items : []);
</script>

{#if ordered}
	<ol class={cn("list-decimal space-y-1 pl-6", className)}>
		{#each safeItems as item}
			<li>{item}</li>
		{/each}
	</ol>
{:else}
	<ul class={cn("list-disc space-y-1 pl-6", className)}>
		{#each safeItems as item}
			<li>{item}</li>
		{/each}
	</ul>
{/if}
