<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/pixel-scene/BasicUsage.svelte.
import { ref } from "vue";
import { PixelScene } from "fancy-ui-vue";

// The component never changes `night`: the page owns it.
const night = ref(false);
</script>

<template>
	<PixelScene
		scene="alpine"
		:night="night"
		class="border-foreground/10 text-foreground h-[340px] w-full cursor-pointer rounded-2xl border"
		@click="night = !night"
	>
		<div class="pointer-events-none absolute top-5 left-5 max-w-[460px] pr-5 sm:top-9 sm:left-9">
			<p class="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
				Season notes · {{ night ? "After dark" : "Morning" }}
			</p>
			<h3 class="mt-2 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
				First snow on the ridge
			</h3>
			<p class="text-muted-foreground mt-3 hidden max-w-sm text-sm leading-relaxed sm:block">
				Move across the picture to see it through the lens. Click anywhere to let the night fall.
			</p>
			<button
				type="button"
				:aria-pressed="night"
				class="border-foreground/20 bg-background/70 hover:bg-background focus-visible:ring-ring pointer-events-auto mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
				@click.stop="night = !night"
			>
				<span
					class="size-2 rounded-full"
					:class="night ? 'bg-[#ffd15c]' : 'bg-foreground/30'"
					aria-hidden="true"
				></span>
				Night
			</button>
		</div>
	</PixelScene>
</template>
