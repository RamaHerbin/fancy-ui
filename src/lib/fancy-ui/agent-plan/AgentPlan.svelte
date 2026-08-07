<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { PlanStepData } from "../_internals/ai-types.js";

	/**
	 * Props for AgentPlan
	 */
	export interface AgentPlanProps {
		/** The plan, in the order the agent means to work through it. Nests via `substeps`. */
		steps: PlanStepData[];
		/** Header text, sitting beside the done/total count. */
		label?: string;
		/** Whether the thin completion bar shows under the header. */
		showProgress?: boolean;
		/** Called when a row is activated; supplying it turns every row into a button. */
		onSelect?: (step: PlanStepData) => void;
		/** Replaces the built-in row body, keeping the glyph and the indent. */
		item?: Snippet<[PlanStepData, number]>;
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
		steps,
		label = "Plan",
		showProgress = true,
		onSelect,
		item,
		class: className,
		ref = $bindable(null),
	}: AgentPlanProps = $props();

	/** Spoken alongside each step, since the glyph says nothing out loud. */
	const STATUS_LABELS: Record<RunStatus, string> = {
		pending: "Pending",
		running: "Running",
		done: "Completed",
		error: "Failed",
		cancelled: "Cancelled",
	};

	const uid = $props.id();
	const labelId = `${uid}-label`;

	/** One rendered line: the step itself plus where it sits in the flattened list. */
	interface PlanRow {
		step: PlanStepData;
		/**
		 * What the `{#each}` is keyed by. The first step under an id keeps that id,
		 * so a row survives a reordered plan with its DOM node intact; only a repeat
		 * gets a suffix, and the suffix counts occurrences rather than positions. A
		 * model that emits the same id twice would otherwise crash the block, and a
		 * plan that repeats a step is a plan, not an error.
		 */
		key: string;
		/** 0 for a top-level step, 1 for anything nested under one. */
		depth: number;
		/** Position in visual order, substeps included — what `item` receives. */
		index: number;
		/** Last nested row of its group, so the rail can stop rather than run on. */
		lastSub: boolean;
	}

	const rows = $derived.by(() => {
		const out: PlanRow[] = [];
		const seen = new Map<string, number>();

		const push = (step: PlanStepData, depth: number) => {
			const seenBefore = seen.get(step.id) ?? 0;
			seen.set(step.id, seenBefore + 1);
			out.push({
				step,
				key: seenBefore === 0 ? step.id : `${step.id}#${seenBefore}`,
				depth,
				index: out.length,
				lastSub: false,
			});
		};

		for (const step of steps) {
			push(step, 0);

			// One level of indent is all the eye can follow at a glance, so anything
			// deeper is pulled up beside its parent's own children instead of
			// marching further right — depth-first, so a grandchild still reads
			// directly under the child it belongs to.
			const queue = [...(step.substeps ?? [])];
			while (queue.length > 0) {
				const sub = queue.shift() as PlanStepData;
				push(sub, 1);
				if (sub.substeps && sub.substeps.length > 0) queue.unshift(...sub.substeps);
			}

			const last = out[out.length - 1];
			if (last.depth === 1) last.lastSub = true;
		}

		return out;
	});

	// Substeps are steps: a plan that finished four of its five checks and both of
	// the two hiding under one of them is 6/7, not 4/5.
	const total = $derived(rows.length);
	const doneCount = $derived(rows.filter((row) => row.step.status === "done").length);
	const percent = $derived(total === 0 ? 0 : Math.round((doneCount / total) * 1000) / 10);

	// Only the first one: a plan with two things in flight still has one place the
	// reader's eye — and a screen reader's "current step" — should land.
	const currentIndex = $derived(rows.findIndex((row) => row.step.status === "running"));
</script>

{#snippet glyph(status: RunStatus)}
	<!--
		Shape carries the status as well as hue — hollow ring, filled dot, tick,
		cross, dash — so the four states stay apart for anyone who cannot tell the
		colours apart. The words are in the `sr-only` label beside the step.
	-->
	<span
		class="ft-agentplan-glyph"
		class:ft-status-pending={status === "pending"}
		class:ft-status-running={status === "running"}
		class:ft-status-done={status === "done"}
		class:ft-status-error={status === "error"}
		class:ft-status-cancelled={status === "cancelled"}
		aria-hidden="true"
	>
		{#if status === "done"}
			<svg
				class="ft-agentplan-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="m5 13 4 4L19 7" />
			</svg>
		{:else if status === "error"}
			<svg
				class="ft-agentplan-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M6 6l12 12M18 6 6 18" />
			</svg>
		{:else if status === "cancelled"}
			<span class="ft-agentplan-dash"></span>
		{:else if status === "running"}
			<span class="ft-agentplan-dot"></span>
		{:else}
			<span class="ft-agentplan-ring"></span>
		{/if}
	</span>
{/snippet}

{#snippet rowBody(row: PlanRow)}
	{@render glyph(row.step.status)}

	{#if item}
		{@render item(row.step, row.index)}
	{:else}
		<span class="ft-agentplan-text min-w-0 flex-1">
			<!--
				Muted, never struck through: a finished step is still worth reading,
				and a checklist of crossed-out lines is harder to scan, not easier.
			-->
			<span
				class="ft-agentplan-step-label block leading-snug"
				class:text-muted-foreground={row.step.status === "done" || row.step.status === "cancelled"}
				class:font-medium={row.step.status === "running"}>{row.step.label}</span
			>
			<span class="sr-only">{STATUS_LABELS[row.step.status]}</span>
			{#if row.step.detail}
				<span
					class="ft-agentplan-detail text-muted-foreground mt-0.5 block truncate text-xs"
					title={row.step.detail}>{row.step.detail}</span
				>
			{/if}
		</span>
	{/if}
{/snippet}

<div bind:this={ref} class={cn("ft-agentplan w-full text-sm", className)}>
	<div class="ft-agentplan-header">
		<div class="flex items-baseline gap-2">
			<span id={labelId} class="ft-agentplan-label text-foreground truncate font-medium"
				>{label}</span
			>
			<span class="ft-agentplan-count text-muted-foreground ml-auto shrink-0 text-xs tabular-nums"
				>{doneCount}/{total}</span
			>
		</div>

		{#if showProgress}
			<!-- The count above already says it in words, so the bar is decoration. -->
			<div class="ft-agentplan-track" aria-hidden="true">
				<div class="ft-agentplan-bar" style="width: {percent}%"></div>
			</div>
		{/if}
	</div>

	<!--
		Flat list with an indent class rather than nested lists: `listitem` needs
		`list` as its parent, and a wrapper per group would put a plain div between
		them and break the semantics for the sake of a left margin CSS can do.
	-->
	<div class="ft-agentplan-list" role="list" aria-labelledby={labelId}>
		{#each rows as row (row.key)}
			<div
				class="ft-agentplan-row"
				class:ft-agentplan-sub={row.depth === 1}
				class:ft-agentplan-sub-last={row.lastSub}
				role="listitem"
				data-status={row.step.status}
				aria-current={row.index === currentIndex ? "step" : undefined}
			>
				{#if onSelect}
					<button
						type="button"
						class="ft-agentplan-body hover:bg-muted/60 focus-visible:ring-ring flex w-full cursor-pointer items-start gap-2 rounded-md text-left transition-colors focus-visible:ring-1 focus-visible:outline-none"
						onclick={() => onSelect?.(row.step)}
					>
						{@render rowBody(row)}
					</button>
				{:else}
					<div class="ft-agentplan-body flex items-start gap-2 rounded-md">
						{@render rowBody(row)}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.ft-agentplan {
		/* Rail and track are mixes of currentColor, so one value reads correctly on
		   either theme. The status colours cannot do that — they are ink, and no
		   single token clears 4.5:1 on both white and near-black — so they are read
		   at their point of use off the `--ft-status-*` vocabulary this family
		   shares, whose defaults are `light-dark()` pairs. A glyph is a graphical
		   object and owes 3:1, which is why the light half of the grey pair is 0.5
		   rather than 0.55. */
		--ft-agentplan-rail: color-mix(in oklab, currentColor 16%, transparent);
		--ft-agentplan-track-bg: color-mix(in oklab, currentColor 12%, transparent);

		/* Geometry shared by the glyph, the indent, and the substep rail, so moving
		   one moves all three together. */
		--ft-agentplan-glyph-size: 0.875rem;
		--ft-agentplan-row-pad: 0.25rem;
		--ft-agentplan-indent: 1.5rem;
		/* Centre of a top-level glyph: body padding plus half the glyph. */
		--ft-agentplan-rail-x: 0.9375rem;
		/* Where that glyph's centre sits vertically, so the rail can stop on it. */
		--ft-agentplan-rail-stop: 0.875rem;
	}

	.ft-agentplan-header {
		padding: 0 0.5rem 0.375rem;
	}

	.ft-agentplan-track {
		margin-top: 0.375rem;
		height: 0.1875rem;
		border-radius: 9999px;
		background: var(--ft-agentplan-track-bg);
		overflow: hidden;
	}

	.ft-agentplan-bar {
		height: 100%;
		border-radius: inherit;
		background: var(
			--ft-agentplan-bar,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	.ft-agentplan-row {
		position: relative;
	}

	.ft-agentplan-sub {
		padding-left: var(--ft-agentplan-indent);
	}

	/* Drawn per row rather than once behind the group, so it stretches with the
	   row it belongs to and needs no height measurement. */
	.ft-agentplan-sub::before {
		content: "";
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--ft-agentplan-rail-x) - 1px);
		width: 2px;
		background: var(--ft-agentplan-rail);
	}

	/* Stop on the last child's glyph instead of running on into the next
	   top-level step, which belongs to nobody. */
	.ft-agentplan-sub-last::before {
		bottom: auto;
		height: calc(var(--ft-agentplan-rail-stop) + var(--ft-agentplan-row-pad));
	}

	.ft-agentplan-body {
		width: 100%;
		padding: var(--ft-agentplan-row-pad) 0.5rem;
	}

	.ft-agentplan-glyph {
		position: relative;
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: var(--ft-agentplan-glyph-size);
		height: var(--ft-agentplan-glyph-size);
		/* Centres the glyph on the first line of the label rather than its box. */
		margin-top: calc((1.25rem - var(--ft-agentplan-glyph-size)) / 2);
	}

	/*
	 * Each state sets `color` once and every shape inside reads `currentColor`, so
	 * a consumer retints a status by naming one variable. The component's own
	 * `--ft-agentplan-*` sits in front of the shared `--ft-status-*`, which sits in
	 * front of the literal: setting either anywhere up the tree wins without having
	 * to out-specify these scoped rules.
	 */
	.ft-agentplan-glyph.ft-status-pending {
		color: var(
			--ft-agentplan-pending,
			color-mix(
				in oklab,
				var(--ft-status-pending, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260))) 70%,
				transparent
			)
		);
	}

	.ft-agentplan-glyph.ft-status-cancelled {
		color: var(
			--ft-agentplan-cancelled,
			color-mix(
				in oklab,
				var(--ft-status-cancelled, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260))) 55%,
				transparent
			)
		);
	}

	.ft-agentplan-glyph.ft-status-running {
		color: var(
			--ft-agentplan-running,
			var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
		);
	}

	.ft-agentplan-glyph.ft-status-done {
		color: var(
			--ft-agentplan-done,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	.ft-agentplan-glyph.ft-status-error {
		color: var(
			--ft-agentplan-error,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
	}

	.ft-agentplan-icon {
		width: 100%;
		height: 100%;
	}

	.ft-agentplan-ring {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 9999px;
		box-shadow: inset 0 0 0 1.5px currentColor;
	}

	.ft-agentplan-dot {
		position: relative;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: currentColor;
	}

	.ft-agentplan-dash {
		width: 0.625rem;
		height: 2px;
		border-radius: 9999px;
		background: currentColor;
	}

	/*
	 * Everything that moves lives behind the query, so reduced motion is not a
	 * degraded variant to keep in sync: the running step is still a filled accent
	 * dot, it just stops breathing, and the bar lands at its width instead of
	 * sliding to it.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-agentplan-bar {
			transition: width 420ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.ft-agentplan-dot::after {
			content: "";
			position: absolute;
			inset: 0;
			border-radius: inherit;
			background: currentColor;
			animation: ft-agentplan-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
		}
	}

	@keyframes ft-agentplan-ping {
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
