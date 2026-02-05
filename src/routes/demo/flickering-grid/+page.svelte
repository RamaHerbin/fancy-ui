<script lang="ts">
	import { FlickeringGrid } from '$lib/fancy-ui/flickering-grid';
</script>

<svelte:head>
	<title>FlickeringGrid - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">FlickeringGrid</h1>
	<p class="text-muted-foreground mb-8">
		Canvas-based grid of squares with flickering opacity. Automatically pauses when off-screen.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto h-64 w-full max-w-md overflow-hidden rounded-xl border bg-background">
				<FlickeringGrid />
			</div>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Colors</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Use the <code class="rounded bg-muted px-1.5 py-0.5">color</code> prop with a hex value.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="h-48 w-56 overflow-hidden rounded-xl border bg-background">
				<FlickeringGrid color="#6366f1" maxOpacity={0.5} />
			</div>
			<div class="h-48 w-56 overflow-hidden rounded-xl border bg-background">
				<FlickeringGrid color="#ef4444" maxOpacity={0.4} />
			</div>
			<div class="h-48 w-56 overflow-hidden rounded-xl border bg-background">
				<FlickeringGrid color="#22c55e" maxOpacity={0.4} />
			</div>
		</div>
	</section>

	<!-- Grid Size Variations -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Grid Size Variations</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Adjust <code class="rounded bg-muted px-1.5 py-0.5">squareSize</code> and
			<code class="rounded bg-muted px-1.5 py-0.5">gridGap</code>.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="h-48 w-56 overflow-hidden rounded-xl border bg-background">
				<FlickeringGrid squareSize={2} gridGap={2} maxOpacity={0.4} />
			</div>
			<div class="h-48 w-56 overflow-hidden rounded-xl border bg-background">
				<FlickeringGrid squareSize={8} gridGap={4} maxOpacity={0.3} />
			</div>
		</div>
	</section>

	<!-- Flicker Speed -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Flicker Speed</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Control how often squares change with <code class="rounded bg-muted px-1.5 py-0.5">flickerChance</code>.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="h-48 w-56 overflow-hidden rounded-xl border bg-background">
				<FlickeringGrid flickerChance={0.05} maxOpacity={0.4} />
			</div>
			<div class="h-48 w-56 overflow-hidden rounded-xl border bg-background">
				<FlickeringGrid flickerChance={0.8} maxOpacity={0.4} />
			</div>
		</div>
	</section>
</div>
