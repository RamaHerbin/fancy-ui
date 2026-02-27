<script lang="ts">
	import { CardHeader } from "$lib/components/ui/card/index.js";
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = "", children }: Props = $props();
</script>

<CardHeader class={cn(className)}>
	{#if children}
		{@render children()}
	{/if}
</CardHeader>
