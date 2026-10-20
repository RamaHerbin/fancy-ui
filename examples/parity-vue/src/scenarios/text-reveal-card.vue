<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/text-reveal-card/BasicUsage.svelte.
import { TextRevealCard } from "fancy-ui-vue";
</script>

<template>
	<TextRevealCard>
		<p class="mb-4 text-lg font-bold text-white">Move your mouse to reveal</p>
		<template #text>
			<p
				class="bg-gradient-to-b from-white to-neutral-300 bg-clip-text py-6 text-[2rem] font-bold text-transparent md:text-[3rem]"
			>
				I know the secret
			</p>
		</template>
		<template #revealText>
			<p class="py-6 text-[2rem] font-bold text-white/10 md:text-[3rem]">Hover me to see</p>
		</template>
	</TextRevealCard>
</template>
