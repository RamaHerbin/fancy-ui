<script lang="ts">
	import { ColourfulText } from '$lib/fancy-ui/colourful-text';
</script>

<svelte:head>
	<title>ColourfulText - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">ColourfulText</h1>
	<p class="text-muted-foreground mb-8">
		Per-character color animation with shuffling colors every 5 seconds.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
				<h2 class="text-4xl font-bold text-white">
					Make things <ColourfulText text="colourful" />
				</h2>
			</div>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Colors</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Pass a custom <code class="rounded bg-muted px-1.5 py-0.5">colors</code> array.
		</p>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
				<h2 class="text-4xl font-bold text-white">
					<ColourfulText
						text="Ocean Vibes"
						colors={['#0ea5e9', '#06b6d4', '#14b8a6', '#3b82f6', '#6366f1']}
					/>
				</h2>
			</div>
		</div>
	</section>

	<!-- Different Durations -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Transition Speed</h2>
		<div class="rounded-lg border bg-card p-6 space-y-6">
			<div class="flex items-center justify-center rounded-xl bg-slate-950 p-8">
				<div class="text-center">
					<p class="text-xs text-slate-500 mb-2">Fast (0.2s)</p>
					<h2 class="text-3xl font-bold">
						<ColourfulText text="Lightning" duration={0.2} />
					</h2>
				</div>
			</div>
			<div class="flex items-center justify-center rounded-xl bg-slate-950 p-8">
				<div class="text-center">
					<p class="text-xs text-slate-500 mb-2">Slow (1.5s)</p>
					<h2 class="text-3xl font-bold">
						<ColourfulText text="Smooth Flow" duration={1.5} />
					</h2>
				</div>
			</div>
		</div>
	</section>

	<!-- Longer Text -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Longer Text</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
				<p class="text-2xl font-semibold text-center">
					<ColourfulText text="Every character gets its own colour!" />
				</p>
			</div>
		</div>
	</section>
</div>
