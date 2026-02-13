<script lang="ts">
	import { ContainerTextFlip } from '$lib/fancy-ui/container-text-flip';
</script>

<svelte:head>
	<title>ContainerTextFlip - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">ContainerTextFlip</h1>
	<p class="text-muted-foreground mb-8">
		A text container that cycles through words with per-character blur-to-clear animation.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="flex justify-center border rounded-lg p-10 bg-card">
			<div class="flex items-center gap-4">
				<span class="text-4xl md:text-7xl font-bold text-foreground">Build</span>
				<ContainerTextFlip />
			</div>
		</div>
	</section>

	<!-- Custom Words -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Words</h2>
		<div class="flex justify-center border rounded-lg p-10 bg-card">
			<div class="flex items-center gap-4">
				<span class="text-4xl md:text-7xl font-bold text-foreground">Make it</span>
				<ContainerTextFlip words={['stunning', 'brilliant', 'perfect', 'legendary']} />
			</div>
		</div>
	</section>

	<!-- Fast Animation -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Fast Interval</h2>
		<div class="flex justify-center border rounded-lg p-10 bg-card">
			<ContainerTextFlip
				words={['fast', 'quick', 'rapid', 'swift']}
				interval={1500}
				animationDuration={400}
			/>
		</div>
	</section>
</div>
