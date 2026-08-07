<script lang="ts">
	import { onMount } from "svelte";
	import { AgentPlan } from "$lib/fancy-ui/agent-plan";
	import type { PlanStepData, RunStatus } from "$lib/fancy-ui";

	/** How long each step is left running before the next one takes over. */
	const STEP_MS = 900;

	/**
	 * The leaves of the plan, in the order the agent works through them. Only these
	 * advance: the parent below reads its status off the children, the way a real
	 * plan does — it is running while any of them is, and done when all of them are.
	 */
	const LEAVES = [
		{ id: "plan-read", label: "Read the failing test", detail: "tests/retry.spec.ts" },
		{ id: "plan-grep", label: "Search for the retry helper" },
		{ id: "plan-open", label: "Open the module it lives in", detail: "142 lines" },
		{ id: "plan-fix", label: "Cap the backoff at 30s", detail: "One clamp, one comment" },
		{ id: "plan-test", label: "Run the suite", detail: "2 specs still failing" },
		{ id: "plan-report", label: "Summarise what happened" },
	];

	/**
	 * Plans go wrong, so the demo does too: this step ends `error` rather than
	 * `done`, which is the only way the failure glyph and its colour reach the page.
	 */
	const FAILING_ID = "plan-test";

	/** Every leaf running once, plus a final frame with the whole plan finished. */
	const FRAMES = LEAVES.length + 1;

	let stage = $state(FRAMES - 1);

	function leafStatus(index: number, at: number): RunStatus {
		if (index < at) return LEAVES[index].id === FAILING_ID ? "error" : "done";
		return index === at ? "running" : "pending";
	}

	/** A parent is only as finished as its children, and starts when the first one does. */
	function parentStatus(children: RunStatus[]): RunStatus {
		if (children.every((status) => status === "done")) return "done";
		if (children.some((status) => status !== "pending")) return "running";
		return "pending";
	}

	const steps: PlanStepData[] = $derived.by(() => {
		const status = LEAVES.map((_, index) => leafStatus(index, stage));
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

	onMount(() => {
		// A plan that never settles is exactly what reduced motion is asking us not
		// to run, so it gets the finished checklist and no timer at all.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		// The counter lives outside the state it drives, so nothing here reads what
		// it is about to write.
		let frame = 0;
		stage = frame;

		const timer = setInterval(() => {
			frame = (frame + 1) % FRAMES;
			stage = frame;
		}, STEP_MS);

		return () => clearInterval(timer);
	});
</script>

<div class="flex w-full max-w-md flex-col gap-3 p-6">
	<AgentPlan {steps} label="Fix the retry backoff" />

	<p class="text-muted-foreground text-xs">
		The count and the bar take the two nested checks as steps of their own — seven, not five. The
		suite ends red, and the count stops one short of the total because of it.
	</p>
</div>
