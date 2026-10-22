<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/composer/BasicUsage.svelte (self-typing rig included).
import { onMounted, onBeforeUnmount, ref } from "vue";
import { Composer } from "fancy-ui-vue";

const QUESTION = "Why did the deploy stall?";
const KEY_MS = 55;
const SEND_MS = 520;
const REPLY_MS = 380;
const WORD_MS = 32;
const READ_MS = 3200;

const draft = ref("");
const reply = ref("");
const streaming = ref(false);

let timer: ReturnType<typeof setTimeout> | undefined;
let typed = 0;
let driving = false;
let reduced = false;

function sentenceFor(prompt: string): string {
	return `You asked: “${prompt}” — and nothing is wired up behind this composer. The reply is on a timer, arriving one word at a time so the send button has something to turn into.`;
}

function answer(prompt: string) {
	clearTimeout(timer);
	const words = sentenceFor(prompt).split(" ");
	if (reduced) {
		reply.value = words.join(" ");
		streaming.value = false;
		return;
	}
	reply.value = "";
	streaming.value = true;
	let i = 0;
	function chunk() {
		if (i < words.length) {
			reply.value = i === 0 ? words[0] : `${reply.value} ${words[i]}`;
			i += 1;
			timer = setTimeout(chunk, WORD_MS);
			return;
		}
		streaming.value = false;
		if (driving) timer = setTimeout(restart, READ_MS);
	}
	timer = setTimeout(chunk, REPLY_MS);
}

function send(payload: { text: string }) {
	answer(payload.text);
}

function halt() {
	clearTimeout(timer);
	streaming.value = false;
	if (driving) timer = setTimeout(restart, READ_MS);
}

function typeNext() {
	if (typed < QUESTION.length) {
		typed += 1;
		draft.value = QUESTION.slice(0, typed);
		timer = setTimeout(typeNext, KEY_MS);
		return;
	}
	timer = setTimeout(() => {
		const text = draft.value.trim();
		draft.value = "";
		answer(text);
	}, SEND_MS);
}

function restart() {
	reply.value = "";
	draft.value = "";
	typed = 0;
	timer = setTimeout(typeNext, KEY_MS);
}

function handOver() {
	if (!driving) return;
	driving = false;
	clearTimeout(timer);
}

onMounted(() => {
	reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (reduced) {
		reply.value = sentenceFor(QUESTION);
		return;
	}
	driving = true;
	timer = setTimeout(typeNext, READ_MS / 4);
});

onBeforeUnmount(() => {
	driving = false;
	clearTimeout(timer);
});
</script>

<template>
	<div
		class="flex w-full max-w-xl flex-col gap-3 p-6"
		@pointerdown.capture="handOver"
		@keydown.capture="handOver"
	>
		<div
			v-if="reply"
			class="bg-muted text-foreground mr-auto max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3"
		>
			<p class="text-sm leading-relaxed">{{ reply }}</p>
		</div>

		<Composer
			sound
			v-model:value="draft"
			:streaming="streaming"
			placeholder="Ask anything"
			:on-submit="send"
			:on-stop="halt"
		/>

		<p class="text-muted-foreground text-xs">
			Enter sends, Shift+Enter adds a line. While the reply streams the send button becomes a stop
			button, and the composer refuses to send again until it lands.
		</p>
	</div>
</template>
