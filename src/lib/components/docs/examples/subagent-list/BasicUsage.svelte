<script lang="ts">
	import { onMount } from "svelte";
	import { SubagentList } from "$lib/fancy-ui/subagent-list";
	import type { SubagentData } from "$lib/fancy-ui";

	/** How often the fan-out redraws. */
	const TICK_MS = 120;
	/** How long the finished roster is held before the demo spawns them again. */
	const HOLD_MS = 2600;

	// One worker per line: when it is spawned, and how long it takes to land. The
	// whole demo is a function of these, so a frame can be computed from a single
	// elapsed number rather than from whatever the previous frame happened to be.
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

	/**
	 * The roster at a given point in the cycle. Pure: nothing here reads the state
	 * it is about to write, so the tick can never chase its own tail.
	 */
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

	let agents = $state<SubagentData[]>(frame(0));

	onMount(() => {
		// A fan-out that respawns forever is exactly what reduced motion is asking
		// us not to run, so it gets the finished roster and no timer at all.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			agents = frame(CYCLE_MS);
			return;
		}

		const started = Date.now();
		const timer = setInterval(() => {
			agents = frame((Date.now() - started) % CYCLE_MS);
		}, TICK_MS);
		return () => clearInterval(timer);
	});
</script>

<div class="bg-card w-full max-w-xl rounded-lg border p-5">
	<p class="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
		Parallel workers
	</p>
	<SubagentList {agents} />
	<p class="text-muted-foreground mt-3 text-xs">
		Each worker arrives when it is spawned and fills its own bar. The list names itself for screen
		readers as it goes — "3 agents running", then "3 agents finished".
	</p>
</div>
