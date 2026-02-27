<script lang="ts">
	import { TextRevealCard } from "$lib/fancy-ui/text-reveal-card";
</script>

<svelte:head>
	<title>TextRevealCard - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">TextRevealCard</h1>
	<p class="text-muted-foreground mb-8">
		A card that reveals text as the user moves their mouse horizontally, with animated star
		particles.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<TextRevealCard>
				<p class="mb-4 text-lg font-bold text-white">Move your mouse to reveal</p>
				{#snippet text()}
					<p
						class="bg-gradient-to-b from-white to-neutral-300 bg-clip-text py-6 text-[2rem] font-bold text-transparent md:text-[3rem]"
					>
						I know the secret
					</p>
				{/snippet}
				{#snippet revealText()}
					<p class="py-6 text-[2rem] font-bold text-white/10 md:text-[3rem]">Hover me to see</p>
				{/snippet}
			</TextRevealCard>
		</div>
	</section>

	<!-- Custom Stars -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Fewer Stars</h2>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<TextRevealCard starsCount={40}>
				<p class="mb-4 text-sm text-neutral-400">Fewer stars, same effect</p>
				{#snippet text()}
					<p
						class="bg-gradient-to-b from-white to-neutral-300 bg-clip-text py-6 text-[2rem] font-bold text-transparent md:text-[3rem]"
					>
						Less is more
					</p>
				{/snippet}
				{#snippet revealText()}
					<p class="py-6 text-[2rem] font-bold text-white/10 md:text-[3rem]">Minimalist</p>
				{/snippet}
			</TextRevealCard>
		</div>
	</section>
</div>
