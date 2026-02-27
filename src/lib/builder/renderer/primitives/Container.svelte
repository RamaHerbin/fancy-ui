<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	interface Props {
		maxWidth?: string;
		class?: string;
		children?: Snippet;
	}

	let { maxWidth = "max-w-6xl", class: className = "", children }: Props = $props();
</script>

<div class={cn("mx-auto", maxWidth, className)}>
	{#if children}
		{@render children()}
	{/if}
</div>
