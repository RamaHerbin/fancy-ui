<script lang="ts">
	import { FallingStarsBg } from "$lib/fancy-ui/bg-falling-stars";
</script>

<svelte:head>
	<title>FallingStarsBg - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">FallingStarsBg</h1>
	<p class="text-muted-foreground mb-8">
		A canvas-based 3D starfield background with perspective projection, motion trails, and glow
		effects.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="relative h-[400px] overflow-hidden rounded-lg border bg-black">
			<FallingStarsBg />
			<div class="relative z-10 flex h-full items-center justify-center">
				<h2 class="text-4xl font-bold text-white">Falling Stars</h2>
			</div>
		</div>
	</section>

	<!-- Custom Color -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Color</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Use <code class="bg-muted rounded px-1.5 py-0.5">color</code> to change the star color.
		</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="relative h-[250px] overflow-hidden rounded-lg border bg-black">
				<FallingStarsBg color="#60a5fa" />
				<div class="relative z-10 flex h-full items-center justify-center">
					<p class="text-blue-300">color="#60a5fa"</p>
				</div>
			</div>
			<div class="relative h-[250px] overflow-hidden rounded-lg border bg-black">
				<FallingStarsBg color="#f472b6" />
				<div class="relative z-10 flex h-full items-center justify-center">
					<p class="text-pink-300">color="#f472b6"</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Custom Count -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Star Count</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Use <code class="bg-muted rounded px-1.5 py-0.5">count</code> to control the number of stars.
		</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="relative h-[250px] overflow-hidden rounded-lg border bg-black">
				<FallingStarsBg count={50} />
				<div class="relative z-10 flex h-full items-center justify-center">
					<p class="text-sm text-white/80">count=50 (sparse)</p>
				</div>
			</div>
			<div class="relative h-[250px] overflow-hidden rounded-lg border bg-black">
				<FallingStarsBg count={500} />
				<div class="relative z-10 flex h-full items-center justify-center">
					<p class="text-sm text-white/80">count=500 (dense)</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Hero Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Hero Section Example</h2>
		<div class="relative h-[500px] overflow-hidden rounded-lg border bg-black">
			<FallingStarsBg color="#fbbf24" count={300} />
			<div class="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
				<h1 class="mb-4 text-5xl font-bold text-white md:text-6xl">Into the Void</h1>
				<p class="mb-8 max-w-xl text-lg text-white/70">
					Watch the stars streak past as you hurtle through the cosmos at light speed.
				</p>
				<button
					class="rounded-lg bg-white px-6 py-3 font-semibold text-black transition-colors hover:bg-white/90"
				>
					Launch
				</button>
			</div>
		</div>
	</section>
</div>
