<script lang="ts">
	import { HyperText } from '$lib/fancy-ui/hyper-text';
</script>

<svelte:head>
	<title>HyperText - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">HyperText</h1>
	<p class="text-muted-foreground mb-8">
		Character scramble effect that activates on hover. Text scrambles through random characters
		then resolves.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage (hover to trigger)</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
				<HyperText text="Hover me!" class="text-4xl font-bold text-white" />
			</div>
		</div>
	</section>

	<!-- Animate on Load -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Animate on Load</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
				<HyperText text="Auto Start" animateOnLoad class="text-4xl font-bold text-white" />
			</div>
		</div>
	</section>

	<!-- Slow Duration -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Slow Animation (2s)</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
				<HyperText text="Take your time" duration={2000} class="text-3xl font-bold text-white" />
			</div>
		</div>
	</section>
</div>
