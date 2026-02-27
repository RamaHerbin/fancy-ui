<script lang="ts">
	import { LiquidGlass } from "$lib/fancy-ui/liquid-glass";
</script>

<svelte:head>
	<title>LiquidGlass - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">LiquidGlass</h1>
	<p class="text-muted-foreground mb-8">
		A glass-like visual effect using SVG filters for chromatic displacement, creating a liquid glass
		refraction look.
	</p>

	<!-- Demo with background content -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card relative overflow-hidden rounded-lg border p-10" style="min-height: 400px;">
			<!-- Background content -->
			<div class="flex flex-wrap gap-4 p-8">
				<div class="h-20 w-32 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500"></div>
				<div class="h-20 w-32 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500"></div>
				<div class="h-20 w-32 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500"></div>
				<div class="h-20 w-32 rounded-lg bg-gradient-to-br from-orange-500 to-red-500"></div>
				<p class="text-foreground w-full text-lg">
					This is some background text that the liquid glass effect will distort and refract. Move
					or resize the glass element to see the displacement in action.
				</p>
				<div class="h-20 w-32 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"></div>
				<div class="h-20 w-32 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500"></div>
			</div>

			<!-- Glass overlay -->
			<LiquidGlass
				containerClass="!absolute !inset-x-8 !top-16 !bottom-auto h-48 z-10"
				radius={20}
				frost={0.08}
			>
				<div class="text-foreground flex h-full items-center justify-center text-lg font-semibold">
					Liquid Glass Effect
				</div>
			</LiquidGlass>
		</div>
		<p class="text-muted-foreground mt-2 text-sm">
			Note: The liquid glass uses <code>backdrop-filter</code> with SVG displacement maps. Best viewed
			in Chromium-based browsers.
		</p>
	</section>

	<!-- Props showcase -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">High Frost</h2>
		<div class="bg-card relative overflow-hidden rounded-lg border p-10" style="min-height: 300px;">
			<div class="grid grid-cols-3 gap-4 p-4">
				{#each Array(9) as _, i}
					<div
						class="h-16 rounded bg-gradient-to-r from-rose-400 to-violet-400"
						style="opacity: {0.5 + i * 0.05}"
					></div>
				{/each}
			</div>

			<LiquidGlass containerClass="!absolute inset-8 z-10" frost={0.2} radius={24}>
				<div class="text-foreground flex h-full items-center justify-center font-medium">
					frost = 0.2
				</div>
			</LiquidGlass>
		</div>
	</section>
</div>
