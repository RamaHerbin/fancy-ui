<script lang="ts">
	import { HyperText } from "$lib/fancy-ui/hyper-text";
</script>

<svelte:head>
	<title>HyperText - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">HyperText</h1>
	<p class="text-muted-foreground mb-8">
		Character scramble effect that activates on hover. Text scrambles through random characters then
		resolves.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage (hover to trigger)</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="bg-background mx-auto flex items-center justify-center rounded-xl p-12">
				<HyperText text="Hover me!" class="text-foreground text-4xl font-bold" />
			</div>
		</div>
	</section>

	<!-- Animate on Load -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Animate on Load</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="bg-background mx-auto flex items-center justify-center rounded-xl p-12">
				<HyperText text="Auto Start" animateOnLoad class="text-foreground text-4xl font-bold" />
			</div>
		</div>
	</section>

	<!-- Slow Duration -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Slow Animation (2s)</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="bg-background mx-auto flex items-center justify-center rounded-xl p-12">
				<HyperText
					text="Take your time"
					duration={2000}
					class="text-foreground text-3xl font-bold"
				/>
			</div>
		</div>
	</section>
</div>
