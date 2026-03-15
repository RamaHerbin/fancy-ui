<script lang="ts">
	import { BoxReveal } from "$lib/fancy-ui/box-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey1 = $state(0);
	let replayKey2 = $state(0);
	let replayKey3 = $state(0);
</script>

<svelte:head>
	<title>BoxReveal - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">BoxReveal</h1>
	<p class="text-muted-foreground mb-8">
		Content reveal animation with a colored box sliding from left to right.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card relative rounded-lg border p-6">
			<ReplayButton onclick={() => replayKey1++} />
			{#key replayKey1}
				<div class="mx-auto max-w-md space-y-4 rounded-xl p-12">
					<BoxReveal>
						<h2 class="text-4xl font-bold">Box Reveal</h2>
					</BoxReveal>
					<BoxReveal delay={0.4}>
						<p class="text-muted-foreground text-lg">
							UI library for crafting beautiful landing pages.
						</p>
					</BoxReveal>
					<BoxReveal delay={0.6}>
						<div class="flex gap-2">
							<button class="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm"
								>Get Started</button
							>
							<button class="rounded-lg border px-4 py-2 text-sm">Learn More</button>
						</div>
					</BoxReveal>
				</div>
			{/key}
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Colors</h2>
		<div class="bg-card relative rounded-lg border p-6">
			<ReplayButton onclick={() => replayKey2++} />
			{#key replayKey2}
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
			{/key}
		</div>
	</section>

	<!-- Slow Animation -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Slow Animation (1s)</h2>
		<div class="bg-card relative rounded-lg border p-6">
			<ReplayButton onclick={() => replayKey3++} />
			{#key replayKey3}
				<div class="mx-auto max-w-md rounded-xl p-12">
					<BoxReveal duration={1} delay={0.3}>
						<h2 class="text-3xl font-bold">Slow and dramatic</h2>
					</BoxReveal>
				</div>
			{/key}
		</div>
	</section>
</div>
