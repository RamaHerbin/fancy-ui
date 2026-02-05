<script lang="ts">
	import { FallingStarsBg } from '$lib/fancy-ui/bg-falling-stars';
</script>

<svelte:head>
	<title>FallingStarsBg - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">FallingStarsBg</h1>
	<p class="text-muted-foreground mb-8">
		A canvas-based 3D starfield background with perspective projection, motion trails, and glow effects.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="relative rounded-lg border overflow-hidden bg-black h-[400px]">
			<FallingStarsBg />
			<div class="relative z-10 flex items-center justify-center h-full">
				<h2 class="text-4xl font-bold text-white">Falling Stars</h2>
			</div>
		</div>
	</section>

	<!-- Custom Color -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Color</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Use <code class="rounded bg-muted px-1.5 py-0.5">color</code> to change the star color.
		</p>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="relative rounded-lg border overflow-hidden bg-black h-[250px]">
				<FallingStarsBg color="#60a5fa" />
				<div class="relative z-10 flex items-center justify-center h-full">
					<p class="text-blue-300">color="#60a5fa"</p>
				</div>
			</div>
			<div class="relative rounded-lg border overflow-hidden bg-black h-[250px]">
				<FallingStarsBg color="#f472b6" />
				<div class="relative z-10 flex items-center justify-center h-full">
					<p class="text-pink-300">color="#f472b6"</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Custom Count -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Star Count</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Use <code class="rounded bg-muted px-1.5 py-0.5">count</code> to control the number of stars.
		</p>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="relative rounded-lg border overflow-hidden bg-black h-[250px]">
				<FallingStarsBg count={50} />
				<div class="relative z-10 flex items-center justify-center h-full">
					<p class="text-sm text-white/80">count=50 (sparse)</p>
				</div>
			</div>
			<div class="relative rounded-lg border overflow-hidden bg-black h-[250px]">
				<FallingStarsBg count={500} />
				<div class="relative z-10 flex items-center justify-center h-full">
					<p class="text-sm text-white/80">count=500 (dense)</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Hero Example -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Hero Section Example</h2>
		<div class="relative rounded-lg border overflow-hidden bg-black h-[500px]">
			<FallingStarsBg color="#fbbf24" count={300} />
			<div class="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
				<h1 class="text-5xl md:text-6xl font-bold text-white mb-4">
					Into the Void
				</h1>
				<p class="text-lg text-white/70 max-w-xl mb-8">
					Watch the stars streak past as you hurtle through the cosmos at light speed.
				</p>
				<button class="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors">
					Launch
				</button>
			</div>
		</div>
	</section>
</div>
