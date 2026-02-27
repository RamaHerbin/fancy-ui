<script lang="ts">
	import { FlipWords } from "$lib/fancy-ui/flip-words";
</script>

<svelte:head>
	<title>FlipWords - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">FlipWords</h1>
	<p class="text-muted-foreground mb-8">
		Cycling word animation with per-letter fade-in and blur effects.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
				<h2 class="text-4xl font-bold text-white">
					Build
					<FlipWords words={["better", "faster", "stronger", "bolder"]} />
					products
				</h2>
			</div>
		</div>
	</section>

	<!-- Fast Duration -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Fast Cycling (1.5s)</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
				<h2 class="text-3xl font-bold text-white">
					<FlipWords words={["React", "Svelte", "Vue", "Angular"]} duration={1500} />
				</h2>
			</div>
		</div>
	</section>

	<!-- Multi-word phrases -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Multi-word Phrases</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
				<h2 class="text-2xl font-bold text-white">
					<FlipWords
						words={["open source", "developer friendly", "production ready", "fully typed"]}
					/>
				</h2>
			</div>
		</div>
	</section>
</div>
