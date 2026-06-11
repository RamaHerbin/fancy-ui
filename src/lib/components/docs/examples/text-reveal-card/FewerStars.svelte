<script lang="ts">
	import { TextRevealCard } from "$lib/fancy-ui/text-reveal-card";
</script>

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
