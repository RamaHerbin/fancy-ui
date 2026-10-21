<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Own {
		class?: string;
		children?: Snippet;
	}

	type Props = Own & Omit<HTMLAttributes<HTMLDivElement>, keyof Own>;

	let { class: className = "", children, ...restProps }: Props = $props();
</script>

<div {...restProps} class={cn("flex flex-wrap gap-2", className)}>
	{#if children}
		{@render children()}
	{/if}
</div>
