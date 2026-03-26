<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam";
	import type { BorderBeamProps } from "$lib/fancy-ui/border-beam/BorderBeam.svelte";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<svelte:head>
	<title>BorderBeam - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">BorderBeam</h1>
	<p class="text-muted-foreground mb-8">
		An animated beam effect that travels around the border of a container. Place inside an element
		with <code class="bg-muted rounded px-1.5 py-0.5">position: relative</code> and
		<code class="bg-muted rounded px-1.5 py-0.5">overflow: hidden</code>.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<div
				class="bg-background relative mx-auto h-40 w-full max-w-md overflow-hidden rounded-xl border p-6"
			>
				<p class="text-muted-foreground text-center">Content goes here</p>
				<BorderBeam />
			</div>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Colors</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Customize the gradient colors with <code class="bg-muted rounded px-1.5 py-0.5"
				>colorFrom</code
			>
			and
			<code class="bg-muted rounded px-1.5 py-0.5">colorTo</code>.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
				<p class="text-muted-foreground text-center text-xs">Orange → Purple</p>
				<BorderBeam colorFrom="#ffaa40" colorTo="#9c40ff" />
			</div>
			<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
				<p class="text-muted-foreground text-center text-xs">Cyan → Blue</p>
				<BorderBeam colorFrom="#00ffff" colorTo="#0066ff" />
			</div>
			<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
				<p class="text-muted-foreground text-center text-xs">Pink → Yellow</p>
				<BorderBeam colorFrom="#ff00ff" colorTo="#ffff00" />
			</div>
		</div>
	</section>

	<!-- Speed Variations -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Animation Speed</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Control speed with the <code class="bg-muted rounded px-1.5 py-0.5">duration</code> prop (in seconds).
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
				<p class="text-muted-foreground text-center text-xs">Fast (5s)</p>
				<BorderBeam duration={5} />
			</div>
			<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
				<p class="text-muted-foreground text-center text-xs">Default (15s)</p>
				<BorderBeam />
			</div>
			<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
				<p class="text-muted-foreground text-center text-xs">Slow (30s)</p>
				<BorderBeam duration={30} />
			</div>
		</div>
	</section>

	<!-- Size & Border Width -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Size & Border Width</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Adjust <code class="bg-muted rounded px-1.5 py-0.5">size</code> (beam size) and
			<code class="bg-muted rounded px-1.5 py-0.5">borderWidth</code>.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
				<p class="text-muted-foreground text-center text-xs">Small beam</p>
				<BorderBeam size={100} />
			</div>
			<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
				<p class="text-muted-foreground text-center text-xs">Large beam</p>
				<BorderBeam size={300} />
			</div>
			<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
				<p class="text-muted-foreground text-center text-xs">Thick border</p>
				<BorderBeam borderWidth={3} />
			</div>
		</div>
	</section>

	<!-- Multiple Beams -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Multiple Beams</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Combine multiple beams with different <code class="bg-muted rounded px-1.5 py-0.5">delay</code
			> values.
		</p>
		<div class="bg-card rounded-lg border p-6">
			<div
				class="bg-background relative mx-auto h-40 w-full max-w-md overflow-hidden rounded-xl border p-6"
			>
				<p class="text-muted-foreground text-center">Dual beam effect</p>
				<BorderBeam colorFrom="#ffaa40" colorTo="#9c40ff" />
				<BorderBeam colorFrom="#00ffff" colorTo="#0066ff" delay={7.5} />
			</div>
		</div>
	</section>

	<!-- Playground -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Interactive Playground</h2>
		<PropsPlayground
			controls={[
				{ key: 'size', type: 'range', label: 'Size', min: 50, max: 500, step: 10 },
				{ key: 'duration', type: 'range', label: 'Duration (s)', min: 1, max: 60 },
				{ key: 'borderWidth', type: 'range', label: 'Border Width', min: 0.5, max: 8, step: 0.5 },
				{ key: 'anchor', type: 'range', label: 'Anchor', min: 0, max: 100 },
				{ key: 'colorFrom', type: 'color', label: 'Color From' },
				{ key: 'colorTo', type: 'color', label: 'Color To' },
				{ key: 'delay', type: 'number', label: 'Delay (s)', min: 0 },
			]}
			initialValues={{ size: 200, duration: 15, borderWidth: 1.5, anchor: 90, colorFrom: '#ffaa40', colorTo: '#9c40ff', delay: 0 }}
		>
			{#snippet preview(values)}
				<div class="relative h-40 w-full max-w-md overflow-hidden rounded-xl border bg-background p-6">
					<p class="text-muted-foreground text-center">Preview</p>
					<BorderBeam {...values as BorderBeamProps} />
				</div>
			{/snippet}
		</PropsPlayground>
	</section>
</div>
