<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/sources/BasicUsage.svelte.
import { onMounted, onBeforeUnmount, ref } from "vue";
import { Sources, type SourceData } from "fancy-ui-vue";

const answer =
	"Readers rarely click a citation — they look at it. So the pill has to carry enough signal on its own to say where an answer came from, and open into something scannable for the one time in ten that looking is not enough.";

const sources: SourceData[] = [
	{
		id: "s1",
		title: "Designing citation surfaces for generated answers",
		url: "https://docs.example.dev/patterns/citations",
		domain: "docs.example.dev",
		snippet: "A citation is a promise that the answer can be checked, not a footnote.",
	},
	{
		id: "s2",
		title: "Retrieval quality and the illusion of grounding",
		url: "https://research.example.org/papers/grounding",
		domain: "research.example.org",
		snippet: "Four plausible sources under a wrong answer make it read as a right one.",
	},
	{
		id: "s3",
		title: "Why readers glance at sources instead of opening them",
		url: "https://notes.example.net/reading-citations",
		domain: "notes.example.net",
		snippet: "The host name does most of the work; the title does the rest.",
	},
	{
		id: "s4",
		title: "A field guide to attribution in assistant answers",
		url: "https://handbook.example.io/attribution",
		domain: "handbook.example.io",
		snippet: "Say where it came from before anyone has to ask.",
	},
];

const open = ref(false);
let readerTookOver = false;
function markReaderTookOver() {
	readerTookOver = true;
}
let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

	function cycle(next: boolean, after: number) {
		timer = setTimeout(() => {
			if (readerTookOver) return;
			open.value = next;
			cycle(!next, next ? 5200 : 1600);
		}, after);
	}

	cycle(true, 1200);
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
	<div class="bg-card flex w-full max-w-xl flex-col gap-3 rounded-lg border p-5">
		<p class="text-sm leading-relaxed">{{ answer }}</p>

		<Sources
			sound
			:sources="sources"
			v-model:open="open"
			:on-toggle="markReaderTookOver"
		/>
	</div>
</template>
