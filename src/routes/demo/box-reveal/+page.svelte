<script lang="ts">
	import { BoxReveal } from '$lib/fancy-ui/box-reveal';
</script>

<svelte:head>
	<title>BoxReveal - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">BoxReveal</h1>
	<p class="text-muted-foreground mb-8">
		Content reveal animation with a colored box sliding from left to right.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto max-w-md space-y-4 rounded-xl p-12">
				<BoxReveal>
					<h2 class="text-4xl font-bold">Magic UI</h2>
				</BoxReveal>
				<BoxReveal delay={0.4}>
					<p class="text-lg text-muted-foreground">
						UI library for crafting beautiful landing pages.
					</p>
				</BoxReveal>
				<BoxReveal delay={0.6}>
					<div class="flex gap-2">
						<button class="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
							>Get Started</button
						>
						<button class="rounded-lg border px-4 py-2 text-sm">Learn More</button>
					</div>
				</BoxReveal>
			</div>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Colors</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto max-w-md space-y-4 rounded-xl p-12">
				<BoxReveal color="#ff6600">
					<h2 class="text-3xl font-bold">Orange Reveal</h2>
				</BoxReveal>
				<BoxReveal color="#22c55e" delay={0.4}>
					<p class="text-lg">Green reveal with a longer delay.</p>
				</BoxReveal>
				<BoxReveal color="#8b5cf6" delay={0.6}>
					<p class="text-lg">Purple reveal stacked below.</p>
				</BoxReveal>
			</div>
		</div>
	</section>

	<!-- Slow Animation -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Slow Animation (1s)</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto max-w-md rounded-xl p-12">
				<BoxReveal duration={1} delay={0.3}>
					<h2 class="text-3xl font-bold">Slow and dramatic</h2>
				</BoxReveal>
			</div>
		</div>
	</section>
</div>
