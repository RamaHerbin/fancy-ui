<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/agent-plan/BasicUsage.svelte.
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { AgentPlan } from "fancy-ui-vue";
import type { PlanStepData, RunStatus } from "fancy-ui-vue";

const STEP_MS = 900;

const LEAVES = [
	{ id: "plan-read", label: "Read the failing test", detail: "tests/retry.spec.ts" },
	{ id: "plan-grep", label: "Search for the retry helper" },
	{ id: "plan-open", label: "Open the module it lives in", detail: "142 lines" },
	{ id: "plan-fix", label: "Cap the backoff at 30s", detail: "One clamp, one comment" },
	{ id: "plan-test", label: "Run the suite", detail: "2 specs still failing" },
	{ id: "plan-report", label: "Summarise what happened" },
];

const FAILING_ID = "plan-test";
const FRAMES = LEAVES.length + 1;

const stage = ref(FRAMES - 1);

function leafStatus(index: number, at: number): RunStatus {
	if (index < at) return LEAVES[index].id === FAILING_ID ? "error" : "done";
	return index === at ? "running" : "pending";
}

function parentStatus(children: RunStatus[]): RunStatus {
	if (children.every((status) => status === "done")) return "done";
	if (children.some((status) => status !== "pending")) return "running";
	return "pending";
}

const steps = computed<PlanStepData[]>(() => {
	const status = LEAVES.map((_, index) => leafStatus(index, stage.value));
	const substeps: PlanStepData[] = [
		{ ...LEAVES[1], status: status[1] },
		{ ...LEAVES[2], status: status[2] },
	];
	return [
		{ ...LEAVES[0], status: status[0] },
		{
			id: "plan-locate",
			label: "Locate the retry helper",
			status: parentStatus([status[1], status[2]]),
			substeps,
		},
		{ ...LEAVES[3], status: status[3] },
		{ ...LEAVES[4], status: status[4] },
		{ ...LEAVES[5], status: status[5] },
	];
});

let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	let frame = 0;
	stage.value = frame;
	timer = setInterval(() => {
		frame = (frame + 1) % FRAMES;
		stage.value = frame;
	}, STEP_MS);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
	<div class="flex w-full max-w-md flex-col gap-3 p-6">
		<AgentPlan :steps="steps" label="Fix the retry backoff" />

		<p class="text-muted-foreground text-xs">
			The count and the bar take the two nested checks as steps of their own — seven, not five. The
			suite ends red, and the count stops one short of the total because of it.
		</p>
	</div>
</template>
