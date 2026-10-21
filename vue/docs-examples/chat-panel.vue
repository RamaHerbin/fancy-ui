<script setup lang="ts">
import { ref } from "vue";
import { ChatMessage, ChatPanel, Composer } from "fancy-ui-vue";

interface Turn {
	id: string;
	role: "user" | "assistant";
	content: string;
}

const turns = ref<Turn[]>([
	{ id: "t1", role: "user", content: "Why does my transcript jump around?" },
	{
		id: "t2",
		role: "assistant",
		content: "Something is scrolling it for you on every chunk, even when you were reading above.",
	},
]);
const draft = ref("");

function send({ text }: { text: string }) {
	turns.value.push({ id: `t${turns.value.length + 1}`, role: "user", content: text });
}
</script>

<template>
	<div class="h-[26rem] w-full max-w-xl">
		<ChatPanel>
			<template #header>
				<div class="flex items-center justify-between px-4 py-3">
					<p class="text-sm font-semibold">Scrolling behaviour</p>
				</div>
			</template>

			<div class="flex flex-col gap-5 px-4 py-4">
				<ChatMessage
					v-for="turn in turns"
					:key="turn.id"
					:role="turn.role"
					:content="turn.content"
				/>
			</div>

			<template #composer>
				<div class="p-3">
					<Composer v-model:value="draft" placeholder="Ask a follow-up" :on-submit="send" />
				</div>
			</template>
		</ChatPanel>
	</div>
</template>
