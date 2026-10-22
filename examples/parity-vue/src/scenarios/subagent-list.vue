<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/subagent-list/BasicUsage.svelte.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { SubagentList, type SubagentData } from "fancy-ui-vue";

const TICK_MS = 120;
const HOLD_MS = 2600;

const script = [
	{
		id: "researcher",
		name: "Researcher",
		task: "Read the changelog for breaking changes",
		model: "mini",
		startAt: 0,
		durationMs: 3600,
	},
	{
		id: "writer",
		name: "Writer",
		task: "Draft the migration note",
		model: "pro",
		startAt: 900,
		durationMs: 5400,
	},
	{
		id: "reviewer",
		name: "Reviewer",
		task: "Check every code sample still compiles",
		model: "pro",
		startAt: 1800,
		durationMs: 4200,
	},
];

const CYCLE_MS = Math.max(...script.map((s) => s.startAt + s.durationMs)) + HOLD_MS;

function frame(elapsed: number): SubagentData[] {
	return script
		.filter((worker) => elapsed >= worker.startAt)
		.map(({ id, name, task, model, startAt, durationMs }) => {
			const ran = elapsed - startAt;
			return ran >= durationMs
				? { id, name, task, model, status: "done" as const }
				: { id, name, task, model, status: "running" as const, progress: ran / durationMs };
		});
}

const agents = ref<SubagentData[]>(frame(0));
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		agents.value = frame(CYCLE_MS);
		return;
	}

	const started = Date.now();
	timer = setInterval(() => {
		agents.value = frame((Date.now() - started) % CYCLE_MS);
	}, TICK_MS);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
	<div class="bg-card w-full max-w-xl rounded-lg border p-5">
		<p class="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
			Parallel workers
		</p>
		<SubagentList :agents="agents" />
		<p class="text-muted-foreground mt-3 text-xs">
			Each worker arrives when it is spawned and fills its own bar. The list names itself for screen
			readers as it goes — "3 agents running", then "3 agents finished".
		</p>
	</div>
</template>
