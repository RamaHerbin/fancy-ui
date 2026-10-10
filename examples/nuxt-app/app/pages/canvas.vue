<script setup lang="ts">
import { useTemplateRef } from "vue";
import { cn, Button, Confetti, MatrixRain, MosaicGlow, Sparkles } from "fancy-ui-vue";

// SSR/hydration gate for canvas components: each one only touches its canvas
// 2D context after mount, so the server renders an empty canvas element and
// the client picks up drawing after hydration.
const confettiRef = useTemplateRef<InstanceType<typeof Confetti>>("confetti");

function fireConfetti() {
	confettiRef.value?.fire();
}
</script>

<template>
	<main :class="cn('mx-auto max-w-2xl p-8')">
		<h1 :class="cn('text-2xl font-semibold')">canvas</h1>

		<div :class="cn('mt-4 flex flex-col gap-6')">
			<Sparkles :class="cn('h-32 w-full rounded-md border border-neutral-300')" />

			<MosaicGlow :seed="7" :class="cn('h-48 w-full rounded-md')">
				<p :class="cn('p-6 text-sm text-white')">Content over the mosaic.</p>
			</MosaicGlow>

			<div :class="cn('relative h-48 w-full overflow-hidden rounded-md bg-black')">
				<MatrixRain />
			</div>

			<div :class="cn('flex flex-col items-start gap-2')">
				<Confetti
					ref="confetti"
					manual-start
					:class="cn('pointer-events-none fixed inset-0 h-full w-full')"
				/>
				<Button @click="fireConfetti">Fire confetti</Button>
			</div>
		</div>
	</main>
</template>
