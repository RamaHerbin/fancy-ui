<script lang="ts">
	import { BoxReveal } from "$lib/fancy-ui/box-reveal";

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
			<button
				onclick={() => replayKey1++}
				class="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
				aria-label="Replay animation"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					focusable="false"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
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
			<button
				onclick={() => replayKey2++}
				class="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
				aria-label="Replay animation"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					focusable="false"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
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
			<button
				onclick={() => replayKey3++}
				class="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
				aria-label="Replay animation"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					focusable="false"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
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
