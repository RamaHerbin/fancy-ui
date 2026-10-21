<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Own {
		class?: string;
		children?: Snippet;
	}

	type Props = Own & Omit<HTMLAttributes<HTMLParagraphElement>, keyof Own>;

	let { class: className = "", children, ...restProps }: Props = $props();
</script>

<p {...restProps} class={cn("text-xs/relaxed select-none", className)}>
	{#if children}
		{@render children()}
	{/if}
</p>
