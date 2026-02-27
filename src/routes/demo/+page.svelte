<script lang="ts">
	import {
		categories,
		categoryLabels,
		categoryDescriptions,
		getComponentsGroupedByCategory,
		getStats,
	} from "$lib/fancy-ui/registry.js";

	const grouped = getComponentsGroupedByCategory();
	const stats = getStats();
</script>

<svelte:head>
	<title>Components - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-4xl font-bold">Components</h1>
	<p class="text-muted-foreground mb-8">
		{stats.done} components ported to Svelte 5. Click on any component to see it in action.
	</p>

	{#each categories as category}
		{@const items = grouped[category]}
		{#if items.length > 0}
			<section class="mb-10">
				<h2 class="mb-1 text-xl font-semibold">{categoryLabels[category]}</h2>
				<p class="text-muted-foreground mb-4 text-sm">{categoryDescriptions[category]}</p>
				<div class="grid gap-3">
					{#each items as component}
						<a
							href="/demo/{component.slug}"
							class="group bg-card hover:bg-accent flex items-center justify-between rounded-lg border p-4 transition-colors"
						>
							<div>
								<h3 class="group-hover:text-accent-foreground font-semibold">
									{component.name}
								</h3>
								<p class="text-muted-foreground text-sm">{component.description}</p>
							</div>
							<div class="flex items-center gap-2">
								{#if component.status === "done"}
									<span
										class="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"
									>
										Done
									</span>
								{:else if component.status === "in-progress"}
									<span
										class="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400"
									>
										In Progress
									</span>
								{:else}
									<span
										class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium"
									>
										Planned
									</span>
								{/if}
								<svg
									class="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-1"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	{/each}
</div>
