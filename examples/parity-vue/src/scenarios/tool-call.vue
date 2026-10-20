<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/tool-call/BasicUsage.svelte.
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { ToolCall } from "fancy-ui-vue";

/** How often the running call's stopwatch refreshes. */
const TICK_MS = 250;
/** How long a pretend call runs before another one takes its place. */
const CYCLE_MS = 9000;
/** What reduced motion sees instead of a clock that never settles. */
const STILL_MS = 4200;

const elapsedMs = ref(0);

const search = {
	id: "call_1",
	name: "search_docs",
	status: "done" as const,
	input: { query: "retry policy", limit: 3 },
	output: { hits: 3, top: "billing/retries.md", tookMs: 812 },
	durationMs: 1400,
};

const fetching = computed(() => ({
	id: "call_2",
	name: "fetch_changelog",
	status: "running" as const,
	input: { repo: "acme/billing", since: "2026-07-01" },
	durationMs: elapsedMs.value,
}));

const posting = {
	id: "call_3",
	name: "post_summary",
	status: "error" as const,
	input: { channel: "#releases", blocks: 4 },
	error: "429 Too Many Requests — that channel is rate limited for another 38s.",
	durationMs: 240,
};

let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		elapsedMs.value = STILL_MS;
		return;
	}
	const started = Date.now();
	timer = setInterval(() => {
		elapsedMs.value = (Date.now() - started) % CYCLE_MS;
	}, TICK_MS);
});

onBeforeUnmount(() => {
	if (timer) clearInterval(timer);
});
</script>

<template>
	<div class="flex w-full max-w-xl flex-col gap-2 p-6">
		<ToolCall sound :call="search" />
		<ToolCall sound :call="fetching" />
		<ToolCall sound :call="posting" />

		<p class="text-muted-foreground mt-2 text-xs">
			Click any header to see what went out and what came back. The failed call opened itself — but
			close it and it stays closed.
		</p>
	</div>
</template>
