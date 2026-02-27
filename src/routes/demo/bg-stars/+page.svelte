<script lang="ts">
	import { StarsBackground } from "$lib/fancy-ui/bg-stars";
</script>

<svelte:head>
	<title>StarsBackground - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">StarsBackground</h1>
	<p class="text-muted-foreground mb-8">
		An animated starfield background with parallax mouse tracking. Stars scroll upward at different
		speeds creating depth.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="overflow-hidden rounded-lg border">
			<StarsBackground class="h-[400px]">
				<div class="relative z-10 flex h-full items-center justify-center">
					<h2 class="text-4xl font-bold text-white">Move your mouse</h2>
				</div>
			</StarsBackground>
		</div>
	</section>

	<!-- Custom Color -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Star Color</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Use <code class="bg-muted rounded px-1.5 py-0.5">starColor</code> to change the color of the stars.
		</p>
		<div class="overflow-hidden rounded-lg border">
			<StarsBackground class="h-[300px]" starColor="#60a5fa">
				<div class="relative z-10 flex h-full items-center justify-center">
					<p class="text-xl text-blue-300">Blue stars</p>
				</div>
			</StarsBackground>
		</div>
	</section>

	<!-- Faster Speed -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Animation Speed</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Use <code class="bg-muted rounded px-1.5 py-0.5">speed</code> to control animation duration (lower
			= faster).
		</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="overflow-hidden rounded-lg border">
				<StarsBackground class="h-[200px]" speed={20}>
					<div class="relative z-10 flex h-full items-center justify-center">
						<p class="text-sm text-white/80">speed=20 (fast)</p>
					</div>
				</StarsBackground>
			</div>
			<div class="overflow-hidden rounded-lg border">
				<StarsBackground class="h-[200px]" speed={100}>
					<div class="relative z-10 flex h-full items-center justify-center">
						<p class="text-sm text-white/80">speed=100 (slow)</p>
					</div>
				</StarsBackground>
			</div>
		</div>
	</section>

	<!-- Parallax Factor -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Parallax Factor</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Use <code class="bg-muted rounded px-1.5 py-0.5">factor</code> to control how much the stars move
			with the mouse.
		</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="overflow-hidden rounded-lg border">
				<StarsBackground class="h-[200px]" factor={0.02}>
					<div class="relative z-10 flex h-full items-center justify-center">
						<p class="text-sm text-white/80">factor=0.02 (subtle)</p>
					</div>
				</StarsBackground>
			</div>
			<div class="overflow-hidden rounded-lg border">
				<StarsBackground class="h-[200px]" factor={0.15}>
					<div class="relative z-10 flex h-full items-center justify-center">
						<p class="text-sm text-white/80">factor=0.15 (dramatic)</p>
					</div>
				</StarsBackground>
			</div>
		</div>
	</section>

	<!-- Spring Settings -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Spring Settings</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Adjust <code class="bg-muted rounded px-1.5 py-0.5">stiffness</code> and
			<code class="bg-muted rounded px-1.5 py-0.5">damping</code> for parallax feel.
		</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="overflow-hidden rounded-lg border">
				<StarsBackground class="h-[200px]" stiffness={100} damping={10}>
					<div class="relative z-10 flex h-full items-center justify-center">
						<p class="text-sm text-white/80">Bouncy (stiff=100, damp=10)</p>
					</div>
				</StarsBackground>
			</div>
			<div class="overflow-hidden rounded-lg border">
				<StarsBackground class="h-[200px]" stiffness={20} damping={40}>
					<div class="relative z-10 flex h-full items-center justify-center">
						<p class="text-sm text-white/80">Smooth (stiff=20, damp=40)</p>
					</div>
				</StarsBackground>
			</div>
		</div>
	</section>

	<!-- Full Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Hero Section Example</h2>
		<div class="overflow-hidden rounded-lg border">
			<StarsBackground class="h-[500px]" starColor="#fbbf24">
				<div
					class="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center"
				>
					<h1 class="mb-4 text-5xl font-bold text-white md:text-6xl">Explore the Universe</h1>
					<p class="mb-8 max-w-xl text-lg text-white/70">
						A journey through the cosmos awaits. Discover the wonders of space with our interactive
						starfield.
					</p>
					<button
						class="rounded-lg bg-white px-6 py-3 font-semibold text-black transition-colors hover:bg-white/90"
					>
						Get Started
					</button>
				</div>
			</StarsBackground>
		</div>
	</section>
</div>
