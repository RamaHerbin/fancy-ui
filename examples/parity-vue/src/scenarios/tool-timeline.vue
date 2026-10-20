<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/tool-timeline/BasicUsage.svelte.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { ToolTimeline } from "fancy-ui-vue";

// One agent session, oldest first. Timestamps are offsets from mount.
const now = Date.now();

const session = [
	{
		id: "read-utils",
		verb: "Read",
		target: "src/lib/utils.ts",
		detail: "Looking for the class merge helper",
		timestamp: now - 6 * 60_000,
	},
	{
		id: "search",
		verb: "Searched",
		target: "**/*.svelte",
		detail: "42 files matched",
		timestamp: now - 5 * 60_000,
	},
	{
		id: "edit-page",
		verb: "Edited",
		target: "src/routes/+page.svelte",
		additions: 24,
		deletions: 7,
		timestamp: now - 3 * 60_000,
	},
	{
		id: "create-test",
		verb: "Created",
		target: "src/lib/fancy-ui/tool-timeline/ToolTimeline.test.ts",
		additions: 96,
		timestamp: now - 90_000,
	},
	{
		id: "run-tests",
		verb: "Ran",
		target: "pnpm vitest run",
		detail: "18 passed",
		timestamp: now - 20_000,
	},
];

const items = ref(session.slice(0, 2));
let timer: ReturnType<typeof setTimeout> | undefined;
let next = 2;

function tick() {
	if (next < session.length) {
		items.value = session.slice(0, next + 1);
		next += 1;
		timer = setTimeout(tick, 1200);
		return;
	}
	timer = setTimeout(restart, 3000);
}

function restart() {
	items.value = session.slice(0, 2);
	next = 2;
	timer = setTimeout(tick, 1200);
}

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		items.value = session;
		return;
	}
	timer = setTimeout(tick, 1200);
});

onBeforeUnmount(() => {
	if (timer) clearTimeout(timer);
});
</script>

<template>
	<div class="bg-card w-full max-w-xl rounded-lg border p-5">
		<p class="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
			Session activity
		</p>
		<ToolTimeline :items="items" />
	</div>
</template>
