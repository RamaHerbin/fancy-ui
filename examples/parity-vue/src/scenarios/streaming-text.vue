<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/streaming-text/BasicUsage.svelte.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { StreamingText } from "fancy-ui-vue";

const source =
	"A model answers one token at a time, so the surface it lands on should show that. Each chunk arrives tinted and settles into the paragraph a moment later, which makes the seam between what was already there and what just came in legible without moving any of the text around.";

const words = source.split(" ");

const text = ref("");
const streaming = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		text.value = source;
		return;
	}

	let i = 0;

	function tick() {
		if (i < words.length) {
			text.value = i === 0 ? words[0] : `${text.value} ${words[i]}`;
			i += 1;
			timer = setTimeout(tick, 90);
			return;
		}
		streaming.value = false;
		timer = setTimeout(restart, 2400);
	}

	function restart() {
		text.value = "";
		i = 0;
		streaming.value = true;
		timer = setTimeout(tick, 160);
	}

	restart();
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
	<div class="bg-card w-full max-w-xl rounded-lg border p-5">
		<p class="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">Assistant</p>
		<StreamingText
			:text="text"
			:streaming="streaming"
			class="text-sm leading-relaxed"
			tint-color="#6366f1"
		/>
	</div>
</template>
