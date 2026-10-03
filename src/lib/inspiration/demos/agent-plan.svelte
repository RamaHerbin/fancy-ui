<script lang="ts">
	import { onMount } from "svelte";
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { AgentPlan } from "$lib/fancy-ui/agent-plan";
	import type { PlanStepData, RunStatus } from "$lib/fancy-ui";

	let { values }: { values: PlaygroundValues } = $props();

	const STEP_MS = 1100;
	const LEAVES = [
		{ id: "read", label: "Read the failing test" },
		{ id: "find", label: "Find the retry helper" },
		{ id: "fix", label: "Cap the backoff at 30s" },
		{ id: "test", label: "Run the suite" },
	];
	/** Every leaf running once, plus a frame with the whole plan finished. */
	const FRAMES = LEAVES.length + 1;

	let stage = $state(2);

	const steps: PlanStepData[] = $derived(
		LEAVES.map((leaf, index) => {
			const status: RunStatus = index < stage ? "done" : index === stage ? "running" : "pending";
			return { ...leaf, status };
		})
	);

	onMount(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			stage = FRAMES - 1;
			return;
		}
		let frame = 0;
		stage = frame;
		const timer = setInterval(() => {
			frame = (frame + 1) % FRAMES;
			stage = frame;
		}, STEP_MS);
		return () => clearInterval(timer);
	});
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<AgentPlan
		{steps}
		label="Fix the retry backoff"
		showProgress={values.showProgress as boolean}
		class="w-full max-w-[320px]"
	/>
</div>
