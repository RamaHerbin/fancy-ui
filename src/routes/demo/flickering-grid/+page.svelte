<script lang="ts">
	import { FlickeringGrid } from "$lib/fancy-ui/flickering-grid";
</script>

<svelte:head>
	<title>FlickeringGrid - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">FlickeringGrid</h1>
	<p class="text-muted-foreground mb-8">
		Canvas-based grid of squares with flickering opacity. Automatically pauses when off-screen.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="bg-background mx-auto h-64 w-full max-w-md overflow-hidden rounded-xl border">
				<FlickeringGrid />
			</div>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Colors</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Use the <code class="bg-muted rounded px-1.5 py-0.5">color</code> prop with a hex value.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
				<FlickeringGrid color="#6366f1" maxOpacity={0.5} />
			</div>
			<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
				<FlickeringGrid color="#ef4444" maxOpacity={0.4} />
			</div>
			<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
				<FlickeringGrid color="#22c55e" maxOpacity={0.4} />
			</div>
		</div>
	</section>

	<!-- Grid Size Variations -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Grid Size Variations</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Adjust <code class="bg-muted rounded px-1.5 py-0.5">squareSize</code> and
			<code class="bg-muted rounded px-1.5 py-0.5">gridGap</code>.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
				<FlickeringGrid squareSize={2} gridGap={2} maxOpacity={0.4} />
			</div>
			<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
				<FlickeringGrid squareSize={8} gridGap={4} maxOpacity={0.3} />
			</div>
		</div>
	</section>

	<!-- Flicker Speed -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Flicker Speed</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Control how often squares change with <code class="bg-muted rounded px-1.5 py-0.5"
				>flickerChance</code
			>.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
				<FlickeringGrid flickerChance={0.05} maxOpacity={0.4} />
			</div>
			<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
				<FlickeringGrid flickerChance={0.8} maxOpacity={0.4} />
			</div>
		</div>
	</section>
</div>
