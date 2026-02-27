<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = "", children }: Props = $props();
</script>

<h1 class={cn("mt-3 mb-1 font-bold text-balance select-none", className)}>
	{#if children}
		{@render children()}
	{/if}
</h1>
