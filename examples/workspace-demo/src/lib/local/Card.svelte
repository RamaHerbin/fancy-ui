<script lang="ts">
	import type { Snippet } from "svelte";

	// A titled surface. It is a region named by its heading, so a screen reader
	// can jump between a screen's sections.
	let {
		title,
		description,
		headingLevel = 2,
		actions,
		children,
		class: className = "",
	}: {
		title: string;
		description?: string;
		headingLevel?: 2 | 3 | 4;
		actions?: Snippet;
		children?: Snippet;
		class?: string;
	} = $props();

	const uid = $props.id();
</script>

<section
	aria-labelledby="{uid}-title"
	class="border-border bg-card text-card-foreground rounded-xl border p-4 md:p-5 {className}"
>
	<div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
		<div class="min-w-0">
			<svelte:element this={`h${headingLevel}`} id="{uid}-title" class="text-base font-medium">
				{title}
			</svelte:element>
			{#if description}
				<p class="text-muted-foreground mt-1 text-sm">{description}</p>
			{/if}
		</div>
		{#if actions}
			<div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
		{/if}
	</div>
	{#if children}
		<div class="mt-4">{@render children()}</div>
	{/if}
</section>
