<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/prompt-suggestions/BasicUsage.svelte.
import { onMounted, onBeforeUnmount, ref } from "vue";
import { PromptSuggestions } from "fancy-ui-vue";

const SUGGESTIONS = [
	"Why was the lockfile stale?",
	"Show me the failing job",
	"Turn the cache back on",
	"Summarize this for the team",
];

/** How long the reply sits alone before the follow-ups offer themselves. */
const APPEAR_MS = 700;
/** The beat the pills spend hidden before replaying, after one is picked. */
const REPLAY_MS = 260;

const visible = ref(false);
const turns = ref<string[]>([]);

let timer: ReturnType<typeof setTimeout> | undefined;
let reduced = false;

onMounted(() => {
	reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (reduced) {
		visible.value = true;
		return;
	}
	timer = setTimeout(() => (visible.value = true), APPEAR_MS);
});

onBeforeUnmount(() => clearTimeout(timer));

function select(suggestion: string) {
	turns.value = [...turns.value, suggestion];
	if (reduced) return;
	visible.value = false;
	clearTimeout(timer);
	timer = setTimeout(() => (visible.value = true), REPLAY_MS);
}
</script>

<template>
	<div class="flex w-full max-w-xl flex-col gap-3">
		<div class="bg-muted text-foreground mr-auto max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3">
			<p class="text-sm leading-relaxed">
				The build is green again. The failure came from a stale lockfile in the CI cache rather than
				from anything in your branch — I re-ran the job with the cache disabled and every suite
				passed on the first attempt.
			</p>
		</div>

		<div
			v-for="(turn, i) in turns"
			:key="i"
			class="bg-primary text-primary-foreground ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5"
		>
			<p class="text-sm">{{ turn }}</p>
		</div>

		<PromptSuggestions
			sound
			:suggestions="SUGGESTIONS"
			:visible="visible"
			:on-select="select"
			label="Follow-up prompts"
			class="mt-1"
		/>
	</div>
</template>
