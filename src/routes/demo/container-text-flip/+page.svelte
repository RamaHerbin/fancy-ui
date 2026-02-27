<script lang="ts">
	import { ContainerTextFlip } from "$lib/fancy-ui/container-text-flip";
</script>

<svelte:head>
	<title>ContainerTextFlip - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">ContainerTextFlip</h1>
	<p class="text-muted-foreground mb-8">
		A text container that cycles through words with per-character blur-to-clear animation.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
			<div class="flex items-center gap-4">
				<span class="text-foreground text-4xl font-bold md:text-7xl">Build</span>
				<ContainerTextFlip />
			</div>
		</div>
	</section>

	<!-- Custom Words -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Words</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
			<div class="flex items-center gap-4">
				<span class="text-foreground text-4xl font-bold md:text-7xl">Make it</span>
				<ContainerTextFlip words={["stunning", "brilliant", "perfect", "legendary"]} />
			</div>
		</div>
	</section>

	<!-- Fast Animation -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Fast Interval</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
			<ContainerTextFlip
				words={["fast", "quick", "rapid", "swift"]}
				interval={1500}
				animationDuration={400}
			/>
		</div>
	</section>
</div>
