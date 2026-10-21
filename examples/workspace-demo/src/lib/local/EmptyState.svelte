<script lang="ts">
	import type { Snippet } from "svelte";

	// Nothing here yet: says what is missing and carries the one action that
	// fills it (the `children`, usually a Button). Not an alert, nothing failed.
	let {
		title,
		description,
		icon,
		children,
		class: className = "",
	}: {
		title: string;
		description?: string;
		icon?: Snippet;
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<div
	class="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center {className}"
	data-empty-state
>
	{#if icon}
		<div class="text-muted-foreground" aria-hidden="true">{@render icon()}</div>
	{/if}
	<h2 class="text-base font-medium">{title}</h2>
	{#if description}
		<p class="text-muted-foreground max-w-sm text-sm">{description}</p>
	{/if}
	{#if children}
		<div class="mt-1">{@render children()}</div>
	{/if}
</div>
