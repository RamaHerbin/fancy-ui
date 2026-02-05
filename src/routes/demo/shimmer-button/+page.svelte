<script lang="ts">
	import { ShimmerButton } from '$lib/fancy-ui/shimmer-button';
</script>

<svelte:head>
	<title>ShimmerButton - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">ShimmerButton</h1>
	<p class="text-muted-foreground mb-8">
		A button with a rotating conic-gradient shimmer effect around its border.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6 flex justify-center">
			<ShimmerButton>Shimmer</ShimmerButton>
		</div>
	</section>

	<!-- Shimmer Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Shimmer Colors</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Change the shimmer highlight with the <code class="rounded bg-muted px-1.5 py-0.5">shimmerColor</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap justify-center gap-4">
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton shimmerColor="#ffffff">White</ShimmerButton>
				<span class="text-xs text-muted-foreground">#ffffff</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton shimmerColor="#60a5fa">Blue</ShimmerButton>
				<span class="text-xs text-muted-foreground">#60a5fa</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton shimmerColor="#f472b6">Pink</ShimmerButton>
				<span class="text-xs text-muted-foreground">#f472b6</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton shimmerColor="#4ade80">Green</ShimmerButton>
				<span class="text-xs text-muted-foreground">#4ade80</span>
			</div>
		</div>
	</section>

	<!-- Animation Speed -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Animation Speed</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Control the shimmer speed with the <code class="rounded bg-muted px-1.5 py-0.5">shimmerDuration</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap justify-center gap-4">
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton shimmerDuration="1.5s">Fast (1.5s)</ShimmerButton>
				<span class="text-xs text-muted-foreground">shimmerDuration="1.5s"</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton shimmerDuration="3s">Default (3s)</ShimmerButton>
				<span class="text-xs text-muted-foreground">shimmerDuration="3s"</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton shimmerDuration="6s">Slow (6s)</ShimmerButton>
				<span class="text-xs text-muted-foreground">shimmerDuration="6s"</span>
			</div>
		</div>
	</section>

	<!-- Shimmer Size -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Shimmer Size</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Adjust the border thickness with the <code class="rounded bg-muted px-1.5 py-0.5">shimmerSize</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap justify-center gap-4">
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton shimmerSize="0.03em">Thin</ShimmerButton>
				<span class="text-xs text-muted-foreground">0.03em</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton shimmerSize="0.05em">Default</ShimmerButton>
				<span class="text-xs text-muted-foreground">0.05em</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton shimmerSize="0.1em">Thick</ShimmerButton>
				<span class="text-xs text-muted-foreground">0.1em</span>
			</div>
		</div>
	</section>

	<!-- Custom Background -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Background</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Set a custom background with the <code class="rounded bg-muted px-1.5 py-0.5">background</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap justify-center gap-4">
			<ShimmerButton background="rgba(59, 130, 246, 0.8)" shimmerColor="#93c5fd">
				Blue
			</ShimmerButton>
			<ShimmerButton background="rgba(139, 92, 246, 0.8)" shimmerColor="#c4b5fd">
				Purple
			</ShimmerButton>
			<ShimmerButton background="rgba(20, 83, 45, 0.9)" shimmerColor="#86efac">
				Green
			</ShimmerButton>
		</div>
	</section>

	<!-- Border Radius -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Border Radius</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Change the shape with the <code class="rounded bg-muted px-1.5 py-0.5">borderRadius</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap justify-center gap-4">
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton borderRadius="8px">Rounded</ShimmerButton>
				<span class="text-xs text-muted-foreground">8px</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton borderRadius="100px">Pill (default)</ShimmerButton>
				<span class="text-xs text-muted-foreground">100px</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<ShimmerButton borderRadius="0px">Square</ShimmerButton>
				<span class="text-xs text-muted-foreground">0px</span>
			</div>
		</div>
	</section>
</div>
