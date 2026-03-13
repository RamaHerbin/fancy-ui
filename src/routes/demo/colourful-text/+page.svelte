<script lang="ts">
	import { ColourfulText } from "$lib/fancy-ui/colourful-text";
</script>

<svelte:head>
	<title>ColourfulText - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">ColourfulText</h1>
	<p class="text-muted-foreground mb-8">
		Per-character color animation with shuffling colors every 5 seconds.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="bg-background mx-auto flex items-center justify-center rounded-xl p-12">
				<h2 class="text-foreground text-4xl font-bold">
					Make things <ColourfulText text="colourful" />
				</h2>
			</div>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Colors</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Pass a custom <code class="bg-muted rounded px-1.5 py-0.5">colors</code> array.
		</p>
		<div class="bg-card rounded-lg border p-6">
			<div class="bg-background mx-auto flex items-center justify-center rounded-xl p-12">
				<h2 class="text-foreground text-4xl font-bold">
					<ColourfulText
						text="Ocean Vibes"
						colors={["#0ea5e9", "#06b6d4", "#14b8a6", "#3b82f6", "#6366f1"]}
					/>
				</h2>
			</div>
		</div>
	</section>

	<!-- Different Durations -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Transition Speed</h2>
		<div class="bg-card space-y-6 rounded-lg border p-6">
			<div class="bg-background flex items-center justify-center rounded-xl p-8">
				<div class="text-center">
					<p class="text-muted-foreground mb-2 text-xs">Fast (0.2s)</p>
					<h2 class="text-3xl font-bold">
						<ColourfulText text="Lightning" duration={0.2} />
					</h2>
				</div>
			</div>
			<div class="bg-background flex items-center justify-center rounded-xl p-8">
				<div class="text-center">
					<p class="text-muted-foreground mb-2 text-xs">Slow (1.5s)</p>
					<h2 class="text-3xl font-bold">
						<ColourfulText text="Smooth Flow" duration={1.5} />
					</h2>
				</div>
			</div>
		</div>
	</section>

	<!-- Longer Text -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Longer Text</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="bg-background mx-auto flex items-center justify-center rounded-xl p-12">
				<p class="text-center text-2xl font-semibold">
					<ColourfulText text="Every character gets its own colour!" />
				</p>
			</div>
		</div>
	</section>
</div>
