<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/chat-panel/BasicUsage.svelte.
import { onMounted, onUnmounted, ref } from "vue";
import { ChatMessage, ChatPanel, Composer } from "fancy-ui-vue";

interface Turn {
	id: string;
	role: "user" | "assistant";
	content: string;
}

const ANSWER =
	"Then it lets go. The panel only follows the bottom while you are already there, so scrolling up to re-read something is a decision it respects until you take the pill back down.";

/** Between two words of the reply, and how long a finished answer sits there. */
const WORD_MS = 45;
const READ_MS = 3400;

const turns = ref<Turn[]>([
	{
		id: "t1",
		role: "user",
		content: "Why does my transcript jump around while an answer is still coming in?",
	},
	{
		id: "t2",
		role: "assistant",
		content:
			"Because something is scrolling it for you on every chunk, whether or not you were at the bottom.",
	},
	{ id: "t3", role: "user", content: "And if I scroll up to re-read something?" },
]);

const draft = ref("");
const reply = ref("");
const streaming = ref(false);

let sent = 0;

function send(payload: { text: string }) {
	sent += 1;
	turns.value.push({ id: `sent-${sent}`, role: "user", content: payload.text });
}

let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		reply.value = ANSWER;
		return;
	}

	const words = ANSWER.split(" ");
	let i = 0;

	function word() {
		if (i < words.length) {
			reply.value = i === 0 ? words[0] : `${reply.value} ${words[i]}`;
			i += 1;
			timer = setTimeout(word, WORD_MS);
			return;
		}
		streaming.value = false;
		timer = setTimeout(restart, READ_MS);
	}

	function restart() {
		reply.value = "";
		i = 0;
		streaming.value = true;
		timer = setTimeout(word, 400);
	}

	restart();
});

onUnmounted(() => clearTimeout(timer));
</script>

<template>
	<div class="h-[26rem] w-full max-w-xl">
		<ChatPanel sound :streaming="streaming" :empty="false">
			<template #header>
				<div class="flex items-center justify-between gap-3 px-4 py-3">
					<p class="text-sm font-semibold">Scrolling behaviour</p>
					<span class="text-muted-foreground font-mono text-xs">balanced · 200k</span>
				</div>
			</template>

			<div class="flex flex-col gap-5 px-4 py-4">
				<ChatMessage
					v-for="(turn, i) in turns"
					:key="`${turn.id}#${i}`"
					:role="turn.role"
					:content="turn.content"
				/>

				<ChatMessage role="assistant" :content="reply" :streaming="streaming" />
			</div>

			<template #composer>
				<div class="p-3">
					<Composer sound v-model:value="draft" placeholder="Ask a follow-up" :on-submit="send" />
				</div>
			</template>
		</ChatPanel>
	</div>
</template>
