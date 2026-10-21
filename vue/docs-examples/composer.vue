<script setup lang="ts">
import { ref } from "vue";
import { Composer } from "fancy-ui-vue";

const draft = ref("");
const reply = ref("");
const streaming = ref(false);

function send({ text }: { text: string }) {
	reply.value = `You asked: "${text}"`;
	streaming.value = true;
	// Stand-in for a request: the send button is a stop button until it lands.
	setTimeout(() => (streaming.value = false), 1200);
}
</script>

<template>
	<div class="flex w-full max-w-xl flex-col gap-3">
		<p v-if="reply" class="bg-muted text-foreground rounded-2xl px-4 py-3 text-sm">{{ reply }}</p>
		<Composer
			v-model:value="draft"
			:streaming="streaming"
			placeholder="Ask anything"
			:on-submit="send"
			:on-stop="() => (streaming = false)"
		/>
	</div>
</template>
