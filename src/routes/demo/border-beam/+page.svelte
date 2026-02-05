<script lang="ts">
	import { BorderBeam } from '$lib/fancy-ui/border-beam';
</script>

<svelte:head>
	<title>BorderBeam - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">BorderBeam</h1>
	<p class="text-muted-foreground mb-8">
		An animated beam effect that travels around the border of a container.
		Place inside an element with <code class="rounded bg-muted px-1.5 py-0.5">position: relative</code> and
		<code class="rounded bg-muted px-1.5 py-0.5">overflow: hidden</code>.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="relative mx-auto h-40 w-full max-w-md overflow-hidden rounded-xl border bg-background p-6">
				<p class="text-center text-muted-foreground">Content goes here</p>
				<BorderBeam />
			</div>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Colors</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Customize the gradient colors with <code class="rounded bg-muted px-1.5 py-0.5">colorFrom</code> and
			<code class="rounded bg-muted px-1.5 py-0.5">colorTo</code>.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="relative h-32 w-48 overflow-hidden rounded-xl border bg-background p-4">
				<p class="text-xs text-muted-foreground text-center">Orange → Purple</p>
				<BorderBeam colorFrom="#ffaa40" colorTo="#9c40ff" />
			</div>
			<div class="relative h-32 w-48 overflow-hidden rounded-xl border bg-background p-4">
				<p class="text-xs text-muted-foreground text-center">Cyan → Blue</p>
				<BorderBeam colorFrom="#00ffff" colorTo="#0066ff" />
			</div>
			<div class="relative h-32 w-48 overflow-hidden rounded-xl border bg-background p-4">
				<p class="text-xs text-muted-foreground text-center">Pink → Yellow</p>
				<BorderBeam colorFrom="#ff00ff" colorTo="#ffff00" />
			</div>
		</div>
	</section>

	<!-- Speed Variations -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Animation Speed</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Control speed with the <code class="rounded bg-muted px-1.5 py-0.5">duration</code> prop (in seconds).
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="relative h-32 w-48 overflow-hidden rounded-xl border bg-background p-4">
				<p class="text-xs text-muted-foreground text-center">Fast (5s)</p>
				<BorderBeam duration={5} />
			</div>
			<div class="relative h-32 w-48 overflow-hidden rounded-xl border bg-background p-4">
				<p class="text-xs text-muted-foreground text-center">Default (15s)</p>
				<BorderBeam />
			</div>
			<div class="relative h-32 w-48 overflow-hidden rounded-xl border bg-background p-4">
				<p class="text-xs text-muted-foreground text-center">Slow (30s)</p>
				<BorderBeam duration={30} />
			</div>
		</div>
	</section>

	<!-- Size & Border Width -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Size & Border Width</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Adjust <code class="rounded bg-muted px-1.5 py-0.5">size</code> (beam size) and
			<code class="rounded bg-muted px-1.5 py-0.5">borderWidth</code>.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="relative h-32 w-48 overflow-hidden rounded-xl border bg-background p-4">
				<p class="text-xs text-muted-foreground text-center">Small beam</p>
				<BorderBeam size={100} />
			</div>
			<div class="relative h-32 w-48 overflow-hidden rounded-xl border bg-background p-4">
				<p class="text-xs text-muted-foreground text-center">Large beam</p>
				<BorderBeam size={300} />
			</div>
			<div class="relative h-32 w-48 overflow-hidden rounded-xl border bg-background p-4">
				<p class="text-xs text-muted-foreground text-center">Thick border</p>
				<BorderBeam borderWidth={3} />
			</div>
		</div>
	</section>

	<!-- Multiple Beams -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Multiple Beams</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Combine multiple beams with different <code class="rounded bg-muted px-1.5 py-0.5">delay</code> values.
		</p>
		<div class="rounded-lg border bg-card p-6">
			<div class="relative mx-auto h-40 w-full max-w-md overflow-hidden rounded-xl border bg-background p-6">
				<p class="text-center text-muted-foreground">Dual beam effect</p>
				<BorderBeam colorFrom="#ffaa40" colorTo="#9c40ff" />
				<BorderBeam colorFrom="#00ffff" colorTo="#0066ff" delay={7.5} />
			</div>
		</div>
	</section>
</div>
