<script lang="ts">
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal";

	let replayKey1 = $state(0);
	let replayKey2 = $state(0);
	let replayKey3 = $state(0);
	let replayKey4 = $state(0);
</script>

<svelte:head>
	<title>BlurReveal - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">BlurReveal</h1>
	<p class="text-muted-foreground mb-8">
		Scroll-triggered reveal animation that transitions children from blurred to clear with staggered
		delays.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Each direct child element animates in sequence when scrolled into view.
		</p>
		<div class="bg-card relative rounded-lg border p-8">
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
				<BlurReveal>
					<h3 class="mb-4 text-2xl font-bold">Welcome to the future</h3>
					<p class="text-muted-foreground mb-3">
						This paragraph fades in after the heading, with a slight delay.
					</p>
					<p class="text-muted-foreground">And this one follows with another staggered delay.</p>
				</BlurReveal>
			{/key}
		</div>
	</section>

	<!-- Custom Duration & Delay -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Duration & Delay</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Slower animation with a larger stagger between children.
		</p>
		<div class="bg-card relative rounded-lg border p-8">
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
				<BlurReveal duration={1.5} delay={0.4}>
					<h3 class="mb-4 text-2xl font-bold">Slow reveal</h3>
					<p class="text-muted-foreground mb-3">
						Duration is 1.5s with 0.4s stagger between elements.
					</p>
					<p class="text-muted-foreground">The effect is more dramatic with longer timings.</p>
				</BlurReveal>
			{/key}
		</div>
	</section>

	<!-- Heavy Blur -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Heavy Blur</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Increased blur and vertical offset for a more dramatic entrance.
		</p>
		<div class="bg-card relative rounded-lg border p-8">
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
				<BlurReveal blur="40px" yOffset={40}>
					<h3 class="mb-4 text-2xl font-bold">Bold entrance</h3>
					<p class="text-muted-foreground mb-3">
						40px blur with 40px vertical offset makes the reveal much more pronounced.
					</p>
					<p class="text-muted-foreground">Great for hero sections and landing pages.</p>
				</BlurReveal>
			{/key}
		</div>
	</section>

	<!-- Card Grid -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Staggered Cards</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Works with any elements, including a grid of cards.
		</p>
		<div class="bg-card relative rounded-lg border p-8">
			<button
				onclick={() => replayKey4++}
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
			{#key replayKey4}
				<BlurReveal delay={0.15} class="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div class="bg-background rounded-lg border p-6">
						<h4 class="mb-2 font-semibold">Design</h4>
						<p class="text-muted-foreground text-sm">Beautiful interfaces built with care.</p>
					</div>
					<div class="bg-background rounded-lg border p-6">
						<h4 class="mb-2 font-semibold">Develop</h4>
						<p class="text-muted-foreground text-sm">Clean code that scales with your needs.</p>
					</div>
					<div class="bg-background rounded-lg border p-6">
						<h4 class="mb-2 font-semibold">Deploy</h4>
						<p class="text-muted-foreground text-sm">Ship fast with confidence and reliability.</p>
					</div>
				</BlurReveal>
			{/key}
		</div>
	</section>
</div>
