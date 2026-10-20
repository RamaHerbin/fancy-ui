<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/image-generation/BasicUsage.svelte.
import { onMounted, onBeforeUnmount, ref } from "vue";
import { ImageGeneration } from "fancy-ui-vue";

const PROMPT = "a lone barn under a sodium sunset, 35mm, grain";

const artwork = `data:image/svg+xml,${encodeURIComponent(
	`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>
			<defs>
				<linearGradient id='sky' x1='0' y1='0' x2='0.4' y2='1'>
					<stop offset='0' stop-color='hsl(258 85% 40%)'/>
					<stop offset='0.55' stop-color='hsl(318 78% 55%)'/>
					<stop offset='1' stop-color='hsl(28 95% 62%)'/>
				</linearGradient>
				<radialGradient id='sun' cx='0.68' cy='0.34' r='0.34'>
					<stop offset='0' stop-color='hsl(48 100% 82%)'/>
					<stop offset='1' stop-color='hsl(38 100% 68%)' stop-opacity='0'/>
				</radialGradient>
			</defs>
			<rect width='512' height='512' fill='url(#sky)'/>
			<circle cx='348' cy='174' r='52' fill='hsl(46 100% 76%)'/>
			<rect width='512' height='512' fill='url(#sun)'/>
			<path d='M0 372 120 292 236 356 336 286 512 348 512 512 0 512Z' fill='hsl(266 55% 20%)' opacity='0.85'/>
			<path d='M0 438 132 384 292 448 512 402 512 512 0 512Z' fill='hsl(266 65% 12%)'/>
			<path d='M196 470 196 402 254 372 312 402 312 470Z' fill='hsl(12 45% 26%)'/>
			<path d='M254 470 254 430 288 430 288 470Z' fill='hsl(40 90% 66%)'/>
		</svg>`.replace(/\s+/g, " ")
)}`;

const IDLE_MS = 700;
const GENERATING_MS = 2500;

const status = ref<"idle" | "generating" | "done" | "error">("idle");
let timers: ReturnType<typeof setTimeout>[] = [];

function stop() {
	for (const timer of timers) clearTimeout(timer);
	timers = [];
}

function run() {
	stop();
	status.value = "idle";
	timers.push(setTimeout(() => (status.value = "generating"), IDLE_MS));
	timers.push(setTimeout(() => (status.value = "done"), IDLE_MS + GENERATING_MS));
}

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		status.value = "done";
		return;
	}
	run();
});

onBeforeUnmount(stop);
</script>

<template>
	<div class="grid w-full max-w-2xl gap-6 p-6 sm:grid-cols-2">
		<ImageGeneration :status="status" :src="artwork" :alt="PROMPT" :prompt="PROMPT" />

		<ImageGeneration
			sound
			status="error"
			alt="a rain-slicked alley at night, neon signage"
			prompt="a rain-slicked alley at night, neon signage"
			error-text="The model returned no image"
			:on-retry="run"
		/>
	</div>
</template>
