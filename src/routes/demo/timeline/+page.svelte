<script lang="ts">
	import { Timeline } from "$lib/fancy-ui/timeline";

	const items = [
		{ id: "early-2025", label: "Early 2025" },
		{ id: "late-2024", label: "Late 2024" },
		{ id: "mid-2024", label: "Mid 2024" },
		{ id: "early-2024", label: "Early 2024" },
	];
</script>

<svelte:head>
	<title>Timeline - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Timeline</h1>
	<p class="text-muted-foreground mb-8">
		Vertical timeline with scroll-driven progress line and sticky labels.
	</p>
</div>

<!-- Full-width timeline -->
<Timeline {items} title="Changelog" description="A history of updates and milestones.">
	{#snippet content(item)}
		{#if item.id === "early-2025"}
			<div class="space-y-4">
				<h3 class="text-foreground text-lg font-semibold md:hidden">{item.label}</h3>
				<div class="bg-card rounded-lg border p-4">
					<h4 class="mb-2 font-semibold">New component library</h4>
					<p class="text-muted-foreground text-sm">
						Launched FancyUI with 12+ implemented components including AnimatedBeam, Compare,
						DirectionAwareHover, and more.
					</p>
				</div>
				<div class="bg-card rounded-lg border p-4">
					<h4 class="mb-2 font-semibold">Timeline component</h4>
					<p class="text-muted-foreground text-sm">
						Added scroll-driven timeline with progress indicator and sticky labels.
					</p>
				</div>
			</div>
		{:else if item.id === "late-2024"}
			<div class="space-y-4">
				<h3 class="text-foreground text-lg font-semibold md:hidden">{item.label}</h3>
				<div class="bg-card rounded-lg border p-4">
					<h4 class="mb-2 font-semibold">Project kickoff</h4>
					<p class="text-muted-foreground text-sm">
						Started building FancyUI, a Svelte 5 component library. Established component template,
						registry system, and demo infrastructure.
					</p>
				</div>
			</div>
		{:else if item.id === "mid-2024"}
			<div class="space-y-4">
				<h3 class="text-foreground text-lg font-semibold md:hidden">{item.label}</h3>
				<div class="bg-card rounded-lg border p-4">
					<h4 class="mb-2 font-semibold">Design exploration</h4>
					<p class="text-muted-foreground text-sm">
						Evaluated animation techniques and UI patterns. Prototyped initial components and
						established the visual direction.
					</p>
				</div>
			</div>
		{:else if item.id === "early-2024"}
			<div class="space-y-4">
				<h3 class="text-foreground text-lg font-semibold md:hidden">{item.label}</h3>
				<div class="bg-card rounded-lg border p-4">
					<h4 class="mb-2 font-semibold">SvelteKit foundation</h4>
					<p class="text-muted-foreground text-sm">
						Set up the SvelteKit project with Tailwind CSS, shadcn-svelte, and TypeScript.
						Configured the build pipeline and deployment.
					</p>
				</div>
			</div>
		{/if}
	{/snippet}
</Timeline>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<p class="text-muted-foreground text-center text-sm">
		Scroll up to see the progress line animate.
	</p>
</div>
