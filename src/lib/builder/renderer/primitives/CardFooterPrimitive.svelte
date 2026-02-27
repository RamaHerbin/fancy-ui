<script lang="ts">
	import { CardFooter } from "$lib/components/ui/card/index.js";
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = "", children }: Props = $props();
</script>

<CardFooter class={cn(className)}>
	{#if children}
		{@render children()}
	{/if}
</CardFooter>
