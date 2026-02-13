<script lang="ts">
	import { TextRevealCard } from '$lib/fancy-ui/text-reveal-card';
</script>

<svelte:head>
	<title>TextRevealCard - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">TextRevealCard</h1>
	<p class="text-muted-foreground mb-8">
		A card that reveals text as the user moves their mouse horizontally, with animated star
		particles.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="flex justify-center border rounded-lg p-6 bg-card">
			<TextRevealCard>
				<p class="mb-4 text-lg font-bold text-white">Move your mouse to reveal</p>
				{#snippet text()}
					<p
						class="bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-300 text-[2rem] md:text-[3rem] font-bold py-6"
					>
						I know the secret
					</p>
				{/snippet}
				{#snippet revealText()}
					<p
						class="text-[2rem] md:text-[3rem] font-bold text-white/10 py-6"
					>
						Hover me to see
					</p>
				{/snippet}
			</TextRevealCard>
		</div>
	</section>

	<!-- Custom Stars -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Fewer Stars</h2>
		<div class="flex justify-center border rounded-lg p-6 bg-card">
			<TextRevealCard starsCount={40}>
				<p class="mb-4 text-sm text-neutral-400">Fewer stars, same effect</p>
				{#snippet text()}
					<p
						class="bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-300 text-[2rem] md:text-[3rem] font-bold py-6"
					>
						Less is more
					</p>
				{/snippet}
				{#snippet revealText()}
					<p
						class="text-[2rem] md:text-[3rem] font-bold text-white/10 py-6"
					>
						Minimalist
					</p>
				{/snippet}
			</TextRevealCard>
		</div>
	</section>
</div>
