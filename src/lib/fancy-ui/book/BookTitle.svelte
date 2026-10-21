<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Own {
		class?: string;
		children?: Snippet;
	}

	type Props = Own & Omit<HTMLAttributes<HTMLHeadingElement>, keyof Own>;

	let { class: className = "", children, ...restProps }: Props = $props();
</script>

<h1 {...restProps} class={cn("mt-3 mb-1 font-bold text-balance select-none", className)}>
	{#if children}
		{@render children()}
	{/if}
</h1>
