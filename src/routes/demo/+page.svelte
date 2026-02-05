<script lang="ts">
	import {
		categories,
		categoryLabels,
		categoryDescriptions,
		getComponentsGroupedByCategory,
		getStats
	} from '$lib/fancy-ui/registry.js';

	const grouped = getComponentsGroupedByCategory();
	const stats = getStats();
</script>

<svelte:head>
	<title>Components - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-4xl font-bold mb-2">Components</h1>
	<p class="text-muted-foreground mb-8">
		{stats.done} components implemented to Svelte 5. Click on any component to see it in action.
	</p>

	{#each categories as category}
		{@const items = grouped[category]}
		{#if items.length > 0}
			<section class="mb-10">
				<h2 class="text-xl font-semibold mb-1">{categoryLabels[category]}</h2>
				<p class="text-sm text-muted-foreground mb-4">{categoryDescriptions[category]}</p>
				<div class="grid gap-3">
					{#each items as component}
						<a
							href="/demo/{component.slug}"
							class="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
						>
							<div>
								<h3 class="font-semibold group-hover:text-accent-foreground">
									{component.name}
								</h3>
								<p class="text-sm text-muted-foreground">{component.description}</p>
							</div>
							<div class="flex items-center gap-2">
								{#if component.status === 'done'}
									<span
										class="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"
									>
										Done
									</span>
								{:else if component.status === 'in-progress'}
									<span
										class="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400"
									>
										In Progress
									</span>
								{:else}
									<span
										class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
									>
										Planned
									</span>
								{/if}
								<svg
									class="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1"
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
