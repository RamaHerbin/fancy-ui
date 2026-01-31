<script lang="ts">
	import { Timeline } from '$lib/fancy-ui/timeline';

	const items = [
		{ id: 'early-2025', label: 'Early 2025' },
		{ id: 'late-2024', label: 'Late 2024' },
		{ id: 'mid-2024', label: 'Mid 2024' },
		{ id: 'early-2024', label: 'Early 2024' }
	];
</script>

<svelte:head>
	<title>Timeline - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<div class="mb-8">
		<a href="/demo" class="text-sm text-muted-foreground hover:text-foreground">&larr; Back to components</a>
	</div>

	<h1 class="mb-2 text-3xl font-bold">Timeline</h1>
	<p class="mb-8 text-muted-foreground">
		Vertical timeline with scroll-driven progress line and sticky labels.
	</p>
</div>

<!-- Full-width timeline -->
<Timeline
	{items}
	title="Changelog"
	description="A history of updates and milestones."
>
	{#snippet content(item)}
		{#if item.id === 'early-2025'}
			<div class="space-y-4">
				<h3 class="text-lg font-semibold text-foreground md:hidden">{item.label}</h3>
				<div class="rounded-lg border bg-card p-4">
					<h4 class="mb-2 font-semibold">New component library</h4>
					<p class="text-sm text-muted-foreground">
						Launched FancyUI with 12+ implemented components including AnimatedBeam,
						Compare, DirectionAwareHover, and more.
					</p>
				</div>
				<div class="rounded-lg border bg-card p-4">
					<h4 class="mb-2 font-semibold">Timeline component</h4>
					<p class="text-sm text-muted-foreground">
						Added scroll-driven timeline with progress indicator and sticky labels.
					</p>
				</div>
			</div>
		{:else if item.id === 'late-2024'}
			<div class="space-y-4">
				<h3 class="text-lg font-semibold text-foreground md:hidden">{item.label}</h3>
				<div class="rounded-lg border bg-card p-4">
					<h4 class="mb-2 font-semibold">Project kickoff</h4>
					<p class="text-sm text-muted-foreground">
						Started implementing FancyUI components from Vue to idiomatic Svelte 5.
						Established component template, registry system, and demo infrastructure.
					</p>
				</div>
			</div>
		{:else if item.id === 'mid-2024'}
			<div class="space-y-4">
				<h3 class="text-lg font-semibold text-foreground md:hidden">{item.label}</h3>
				<div class="rounded-lg border bg-card p-4">
					<h4 class="mb-2 font-semibold">Design exploration</h4>
					<p class="text-sm text-muted-foreground">
						Evaluated component libraries and identified FancyUI as the source for
						high-quality animation components. Prototyped initial ports.
					</p>
				</div>
			</div>
		{:else if item.id === 'early-2024'}
			<div class="space-y-4">
				<h3 class="text-lg font-semibold text-foreground md:hidden">{item.label}</h3>
				<div class="rounded-lg border bg-card p-4">
					<h4 class="mb-2 font-semibold">SvelteKit foundation</h4>
					<p class="text-sm text-muted-foreground">
						Set up the SvelteKit project with Tailwind CSS, shadcn-svelte, and TypeScript.
						Configured the build pipeline and deployment.
					</p>
				</div>
			</div>
		{/if}
	{/snippet}
</Timeline>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<p class="text-center text-sm text-muted-foreground">
		Scroll up to see the progress line animate.
	</p>
</div>
