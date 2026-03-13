<script lang="ts">
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

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
			<ReplayButton onclick={() => replayKey1++} />
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
			<ReplayButton onclick={() => replayKey2++} />
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
			<ReplayButton onclick={() => replayKey3++} />
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
			<ReplayButton onclick={() => replayKey4++} />
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
