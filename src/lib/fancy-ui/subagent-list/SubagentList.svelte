<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { SubagentData } from "../_internals/ai-types.js";

	/**
	 * Props for SubagentList
	 */
	export interface SubagentListProps {
		/** The delegated workers, in the order they were spawned */
		agents: SubagentData[];
		/**
		 * Accessible name for the list. Left undefined it is derived from the
		 * statuses — "3 agents running", then "3 agents finished".
		 */
		label?: string;
		/** Called when a row is activated; supplying it turns every row into a button */
		onSelect?: (agent: SubagentData, index: number) => void;
		/** Replaces the built-in row body, keeping the status dot */
		item?: Snippet<[SubagentData, number]>;
		/** Tighter rows with the task line dropped */
		compact?: boolean;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { RunStatus } from "../_internals/ai-types.js";

	let {
		agents,
		label,
		onSelect,
		item,
		compact = false,
		class: className,
		ref = $bindable(null),
	}: SubagentListProps = $props();

	/** The small caption a row shows in place of a progress bar. */
	const STATUS_WORDS: Record<RunStatus, string> = {
		pending: "pending",
		running: "running",
		done: "done",
		error: "error",
		cancelled: "cancelled",
	};

	/**
	 * The spoken form, rendered wherever the row has no visible caption to speak
	 * for it: under a replaced body, and beside the progress bar. A `progressbar`
	 * is children-presentational, so its own name and value are dropped from the
	 * name of a selectable row's button — without these words a running row would
	 * be a name and nothing else.
	 */
	const STATUS_LABELS: Record<RunStatus, string> = {
		pending: "Pending",
		running: "Running",
		done: "Completed",
		error: "Failed",
		cancelled: "Cancelled",
	};

	function isFinished(status: RunStatus): boolean {
		return status === "done" || status === "error" || status === "cancelled";
	}

	const runningCount = $derived(agents.filter((agent) => agent.status === "running").length);
	const allFinished = $derived(
		agents.length > 0 && agents.every((agent) => isFinished(agent.status))
	);

	/**
	 * A fan-out is read for one number: how many workers are still out there. So
	 * the running count leads while anything runs, and gives way to the total once
	 * the last one lands. Anything in between — queued, nothing started — is just
	 * the headcount, since "0 agents running" tells the reader nothing they want.
	 */
	const autoLabel = $derived.by(() => {
		const total = agents.length;
		if (total === 0) return "No agents";
		if (runningCount > 0) return `${runningCount} ${noun(runningCount)} running`;
		if (allFinished) return `${total} ${noun(total)} finished`;
		return `${total} ${noun(total)}`;
	});

	const listLabel = $derived(label ?? autoLabel);

	function noun(count: number): string {
		return count === 1 ? "agent" : "agents";
	}

	/**
	 * A bar is a claim that something is moving, so only a running agent that
	 * reported a number gets one. Everything else — queued, finished, or running
	 * blind — says where it stands in words instead.
	 */
	function showsProgress(agent: SubagentData): boolean {
		return agent.status === "running" && agent.progress != null && Number.isFinite(agent.progress);
	}

	/** Clamped, because a worker reporting 1.4 should fill the track, not overrun it. */
	function percent(progress: number | undefined): number {
		return Math.round(Math.min(1, Math.max(0, progress ?? 0)) * 100);
	}
</script>

<!--
	`ft-subagents-compact` rides a `class:` directive rather than `cn()` so the
	compiler can see the class is used and keeps its scoped rule.
-->
<div
	bind:this={ref}
	class={cn("ft-subagents w-full text-sm", className)}
	class:ft-subagents-compact={compact}
>
	<!--
		`role="list"` is stated rather than left implicit: `list-style: none` strips
		list semantics in Safari, and the count of workers is the point of this list.
	-->
	<ul class="ft-subagents-list" role="list" aria-label={listLabel}>
		<!--
			Keyed by id so a newly spawned worker mounts as a fresh node and plays the
			entrance on its own, while the rows already on screen keep their DOM nodes
			and stay put. The position is appended because the ids come from a model:
			a repeated one would otherwise crash the block, and appending leaves the
			keys of the rows already on screen untouched when a worker is added.
		-->
		{#each agents as agent, index (`${agent.id}#${index}`)}
			<li class="ft-subagents-row">
				{#snippet body()}
					<!--
						Filled versus hollow, not just hue: the five states stay apart for
						anyone who cannot tell the colours apart, and the row says which
						one it is in words beside it.
					-->
					<span
						class="ft-subagents-dot"
						class:ft-status-pending={agent.status === "pending"}
						class:ft-status-running={agent.status === "running"}
						class:ft-status-done={agent.status === "done"}
						class:ft-status-error={agent.status === "error"}
						class:ft-status-cancelled={agent.status === "cancelled"}
						aria-hidden="true"
					></span>

					{#if item}
						<span class="sr-only">{STATUS_LABELS[agent.status]}</span>
						{@render item(agent, index)}
					{:else}
						<span class="ft-subagents-main min-w-0 flex-1">
							<span class="flex min-w-0 items-baseline gap-1.5">
								<span class="ft-subagents-name truncate font-medium" title={agent.name}
									>{agent.name}</span
								>
								{#if agent.model}
									<!--
										`text-foreground/70` rather than `text-muted-foreground`: at
										10px the badge is not large text, so it owes 4.5:1, and the
										muted token only reaches 4.33:1 on a light page. Seventy
										percent of the foreground clears it on both themes.
									-->
									<span class="ft-subagents-model text-foreground/70 shrink-0 font-mono"
										>{agent.model}</span
									>
								{/if}
							</span>
							{#if !compact && agent.task}
								<span
									class="ft-subagents-task text-muted-foreground mt-0.5 block truncate"
									title={agent.task}>{agent.task}</span
								>
							{/if}
						</span>

						<span class="ft-subagents-meta flex shrink-0 items-center">
							{#if showsProgress(agent)}
								{@const value = percent(agent.progress)}
								<span class="sr-only">{STATUS_LABELS[agent.status]}, {value}%</span>
								<span
									class="ft-subagents-progress"
									role="progressbar"
									aria-label={STATUS_LABELS.running}
									aria-valuemin="0"
									aria-valuemax="100"
									aria-valuenow={value}
								>
									<span class="ft-subagents-progress-fill" style="width: {value}%"></span>
								</span>
							{:else}
								<span class="ft-subagents-state text-muted-foreground"
									>{STATUS_WORDS[agent.status]}</span
								>
							{/if}
						</span>
					{/if}
				{/snippet}

				{#if onSelect}
					<button
						type="button"
						class="ft-subagents-body hover:bg-muted/60 focus-visible:ring-ring flex w-full cursor-pointer items-start gap-2.5 rounded-md text-left transition-colors focus-visible:ring-1 focus-visible:outline-none"
						onclick={() => onSelect?.(agent, index)}
					>
						{@render body()}
					</button>
				{:else}
					<span class="ft-subagents-body flex w-full items-start gap-2.5 rounded-md">
						{@render body()}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.ft-subagents {
		/* Track and badge are mixes of currentColor, so one set of values reads
		   correctly in both themes. The dot and the bar fill cannot do that — they
		   are the status vocabulary — so they are read at their point of use off the
		   shared `--ft-status-*` names, whose defaults are `light-dark()` pairs. A
		   dot is a graphical object and owes 3:1, which is why the light half of the
		   grey pair is 0.5 rather than 0.55. */
		--ft-subagents-row-pad: 0.375rem;
		--ft-subagents-dot-size: 0.5rem;
		--ft-subagents-track: color-mix(in oklab, currentColor 14%, transparent);
		--ft-subagents-track-width: 3.5rem;
		--ft-subagents-track-height: 0.25rem;
		--ft-subagents-badge-bg: color-mix(in oklab, currentColor 8%, transparent);
		--ft-subagents-enter-duration: 320ms;
		--ft-subagents-fill-duration: 320ms;
	}

	.ft-subagents-compact {
		--ft-subagents-row-pad: 0.1875rem;
	}

	.ft-subagents-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ft-subagents-body {
		padding: var(--ft-subagents-row-pad) 0.5rem;
	}

	.ft-subagents-dot {
		position: relative;
		display: inline-block;
		flex: none;
		/* Half a 1.25rem line box minus half the dot: the dot sits on the middle of
		   the name, not of the two-line row. */
		margin-top: calc((1.25rem - var(--ft-subagents-dot-size)) / 2);
		width: var(--ft-subagents-dot-size);
		height: var(--ft-subagents-dot-size);
		border-radius: 9999px;
	}

	/* Hollow: nothing has happened yet, or nothing ever will. */
	.ft-subagents-dot.ft-status-pending {
		box-shadow: inset 0 0 0 1.5px
			var(
				--ft-subagents-pending,
				color-mix(
					in oklab,
					var(--ft-status-pending, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260))) 55%,
					transparent
				)
			);
	}

	.ft-subagents-dot.ft-status-cancelled {
		box-shadow: inset 0 0 0 1.5px
			var(
				--ft-subagents-cancelled,
				color-mix(
					in oklab,
					var(--ft-status-cancelled, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260))) 40%,
					transparent
				)
			);
	}

	.ft-subagents-dot.ft-status-running {
		background: var(
			--ft-subagents-running,
			var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
		);
	}

	.ft-subagents-dot.ft-status-done {
		background: var(
			--ft-subagents-done,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	.ft-subagents-dot.ft-status-error {
		background: var(
			--ft-subagents-error,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
	}

	.ft-subagents-model {
		border-radius: 0.25rem;
		background: var(--ft-subagents-badge-bg);
		padding: 0 0.25rem;
		font-size: 0.625rem;
		line-height: 1rem;
	}

	.ft-subagents-task {
		font-size: 0.75rem;
		line-height: 1.25;
	}

	.ft-subagents-meta {
		/* Matches the name's line box, so the caption and the bar both land on the
		   first line rather than in the middle of a two-line row. */
		min-height: 1.25rem;
		margin-left: auto;
	}

	.ft-subagents-state {
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}

	.ft-subagents-progress {
		display: block;
		width: var(--ft-subagents-track-width);
		height: var(--ft-subagents-track-height);
		overflow: hidden;
		border-radius: 9999px;
		background: var(--ft-subagents-track);
	}

	.ft-subagents-progress-fill {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(
			--ft-subagents-bar,
			var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
		);
	}

	/*
	 * Everything that moves lives behind the query, so reduced motion is not a
	 * degraded variant to keep in sync: with these rules gone a new worker simply
	 * appears at its final position, the bar jumps to its width, and a running dot
	 * is still a filled accent dot — it just stops breathing.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-subagents-row {
			animation: ft-subagents-enter var(--ft-subagents-enter-duration) cubic-bezier(0.16, 1, 0.3, 1)
				both;
		}

		.ft-subagents-progress-fill {
			transition: width var(--ft-subagents-fill-duration) cubic-bezier(0.4, 0, 0.2, 1);
		}

		.ft-subagents-dot.ft-status-running::after {
			content: "";
			position: absolute;
			inset: 0;
			border-radius: inherit;
			background: inherit;
			animation: ft-subagents-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
		}
	}

	@keyframes ft-subagents-enter {
		from {
			opacity: 0;
			transform: translateY(-0.25rem);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes ft-subagents-ping {
		from {
			opacity: 0.55;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(2.4);
		}
	}
</style>
