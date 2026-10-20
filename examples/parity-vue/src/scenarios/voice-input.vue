<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/voice-input/BasicUsage.svelte.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { VoiceInput } from "fancy-ui-vue";

/** How fast the pretend recogniser hands back another word. */
const WORD_MS = 400;
const WORDS = "show me the retry policy for failed webhook deliveries".split(" ");

const active = ref(false);
const transcript = ref("");
let spoken = 0;
let timer: ReturnType<typeof setInterval> | undefined;

function reset() {
	spoken = 0;
	transcript.value = "";
}

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		active.value = true;
		transcript.value = WORDS.join(" ");
		return;
	}
	timer = setInterval(() => {
		if (!active.value || spoken >= WORDS.length) return;
		transcript.value = transcript.value ? `${transcript.value} ${WORDS[spoken]}` : WORDS[spoken];
		spoken += 1;
	}, WORD_MS);
});

onBeforeUnmount(() => {
	if (timer) clearInterval(timer);
});
</script>

<template>
	<div class="flex w-full max-w-md flex-col gap-3 p-6">
		<VoiceInput
			sound
			v-model:active="active"
			:transcript="transcript"
			demo
			:onStop="reset"
			:onCancel="reset"
		/>

		<p class="text-muted-foreground text-xs">
			Press the mic and the words arrive as a recogniser would hand them over. The check keeps the
			transcript and closes the panel; the cross throws it away.
		</p>
	</div>
</template>
