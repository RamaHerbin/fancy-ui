<script lang="ts">
	import { InteractiveGridPattern } from '$lib/fancy-ui/interactive-grid-pattern';
</script>

<svelte:head>
	<title>InteractiveGridPattern - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">InteractiveGridPattern</h1>
	<p class="text-muted-foreground mb-8">
		An SVG grid of squares that highlight on hover with a smooth fade-out transition.
		Useful as an interactive background effect.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Default 24x24 grid with 40px squares. Hover over the grid to see the highlight effect.
		</p>
		<div class="rounded-lg border p-0 overflow-hidden">
			<div class="relative flex h-96 w-full items-center justify-center overflow-hidden bg-neutral-950">
				<InteractiveGridPattern
					class="[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]"
				/>
				<p class="z-10 text-lg font-medium text-neutral-400">Hover over the grid</p>
			</div>
		</div>
	</section>

	<!-- Colored Variant -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Colored Variant</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Customize square size and hover color via
			<code class="rounded bg-muted px-1.5 py-0.5">squaresClassName</code>.
		</p>
		<div class="rounded-lg border p-0 overflow-hidden">
			<div class="relative flex h-96 w-full items-center justify-center overflow-hidden bg-neutral-950">
				<InteractiveGridPattern
					width={30}
					height={30}
					squares={[30, 20]}
					squaresClassName="hover:fill-blue-500/30"
					class="[mask-image:radial-gradient(350px_circle_at_center,white,transparent)]"
				/>
				<p class="z-10 text-lg font-medium text-neutral-400">Blue hover effect</p>
			</div>
		</div>
	</section>
</div>
