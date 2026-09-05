import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import type { PlanStepData, RunStatus } from "../../internals/ai-types.js";
import "./agent-plan.css";

/** Spoken alongside each step, since the glyph says nothing out loud. */
const STATUS_LABELS: Record<RunStatus, string> = {
	pending: "Pending",
	running: "Running",
	done: "Completed",
	error: "Failed",
	cancelled: "Cancelled",
};

/** One rendered line: the step itself plus where it sits in the flattened list. */
interface PlanRow {
	step: PlanStepData;
	/**
	 * What the row list is keyed by. The id leads, so a row keeps its DOM node
	 * across a re-render, but an occurrence count is appended rather than the
	 * row's flattened position: a model that emits the same id twice would
	 * otherwise collide, and counting by occurrence rather than position means
	 * inserting or removing a step elsewhere in the plan does not change the
	 * key — and so does not remount — a row whose own id never changed.
	 */
	key: string;
	/** 0 for a top-level step, 1 for anything nested under one. */
	depth: number;
	/** Position in visual order, substeps included — what `item` receives. */
	index: number;
	/** Last nested row of its group, so the rail can stop rather than run on. */
	lastSub: boolean;
}

function buildRows(steps: PlanStepData[]): PlanRow[] {
	const out: PlanRow[] = [];
	const seen = new Map<string, number>();
	// Every id in the plan, substeps included: a suffixed key has to clear them
	// as well as the keys already handed out, since a step may genuinely be
	// called "x#1" while two others are called "x".
	const ids = new Set<string>();
	const collectIds = (list: PlanStepData[]) => {
		for (const step of list) {
			ids.add(step.id);
			if (step.substeps) collectIds(step.substeps);
		}
	};
	collectIds(steps);
	const used = new Set<string>();

	const push = (step: PlanStepData, depth: number) => {
		const occurrence = seen.get(step.id) ?? 0;
		seen.set(step.id, occurrence + 1);
		let key = `${step.id}#${occurrence}`;
		let suffix = occurrence;
		while (ids.has(key) || used.has(key)) {
			suffix++;
			key = `${step.id}#${suffix}`;
		}
		used.add(key);
		out.push({ step, key, depth, index: out.length, lastSub: false });
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

		const last = out[out.length - 1]!;
		if (last.depth === 1) last.lastSub = true;
	}

	return out;
}

/**
 * Shape carries the status as well as hue — hollow ring, filled dot, tick,
 * cross, dash — so the four states stay apart for anyone who cannot tell the
 * colours apart. The words are in the `sr-only` label beside the step.
 */
function Glyph({ status }: { status: RunStatus }) {
	return (
		<span
			className={cn(
				"ft-agentplan-glyph",
				status === "pending" && "ft-status-pending",
				status === "running" && "ft-status-running",
				status === "done" && "ft-status-done",
				status === "error" && "ft-status-error",
				status === "cancelled" && "ft-status-cancelled"
			)}
			aria-hidden="true"
		>
			{status === "done" ? (
				<svg
					className="ft-agentplan-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="m5 13 4 4L19 7" />
				</svg>
			) : status === "error" ? (
				<svg
					className="ft-agentplan-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M6 6l12 12M18 6 6 18" />
				</svg>
			) : status === "cancelled" ? (
				<span className="ft-agentplan-dash"></span>
			) : status === "running" ? (
				<span className="ft-agentplan-dot"></span>
			) : (
				<span className="ft-agentplan-ring"></span>
			)}
		</span>
	);
}

function RowBody({
	row,
	item,
}: {
	row: PlanRow;
	item?: (step: PlanStepData, index: number) => ReactNode;
}) {
	return (
		<>
			<Glyph status={row.step.status} />

			{item ? (
				<>
					<span className="sr-only">{STATUS_LABELS[row.step.status]}</span>
					{item(row.step, row.index)}
				</>
			) : (
				<span className="ft-agentplan-text min-w-0 flex-1">
					{/*
						Muted, never struck through: a finished step is still worth reading,
						and a checklist of crossed-out lines is harder to scan, not easier.
					*/}
					<span
						className={cn(
							"ft-agentplan-step-label block leading-snug",
							(row.step.status === "done" || row.step.status === "cancelled") &&
								"text-muted-foreground",
							row.step.status === "running" && "font-medium"
						)}
					>
						{row.step.label}
					</span>
					<span className="sr-only">{STATUS_LABELS[row.step.status]}</span>
					{row.step.detail ? (
						<span
							className="ft-agentplan-detail text-muted-foreground mt-0.5 block truncate text-xs"
							title={row.step.detail}
						>
							{row.step.detail}
						</span>
					) : null}
				</span>
			)}
		</>
	);
}

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
	item?: (step: PlanStepData, index: number) => ReactNode;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

export const AgentPlan = forwardRef<HTMLDivElement, AgentPlanProps>(function AgentPlan(
	{ steps, label = "Plan", showProgress = true, onSelect, item, className, sound },
	ref
) {
	const uid = useFancyId();
	const labelId = `${uid}-label`;
	const playCue = useSoundCue(sound);

	/** A row activation is a fresh gesture every time — there is no selected
	 *  value on the component to compare against, so the cue plays on every
	 *  pick, repeats included. */
	const selectStep = (step: PlanStepData) => {
		playCue("select");
		onSelect?.(step);
	};

	const rows = buildRows(steps);

	// Substeps are steps: a plan that finished four of its five checks and both of
	// the two hiding under one of them is 6/7, not 4/5.
	const total = rows.length;
	const doneCount = rows.filter((row) => row.step.status === "done").length;
	const percent = total === 0 ? 0 : Math.round((doneCount / total) * 1000) / 10;

	// Only the first one: a plan with two things in flight still has one place the
	// reader's eye — and a screen reader's "current step" — should land.
	const currentIndex = rows.findIndex((row) => row.step.status === "running");

	return (
		<div ref={ref} className={cn("ft-agentplan w-full text-sm", className)}>
			<div className="ft-agentplan-header">
				<div className="flex items-baseline gap-2">
					<span id={labelId} className="ft-agentplan-label text-foreground truncate font-medium">
						{label}
					</span>
					<span className="ft-agentplan-count text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
						{doneCount}/{total}
					</span>
				</div>

				{showProgress ? (
					// The count above already says it in words, so the bar is decoration.
					<div className="ft-agentplan-track" aria-hidden="true">
						<div className="ft-agentplan-bar" style={{ width: `${percent}%` }}></div>
					</div>
				) : null}
			</div>

			{/*
				Flat list with an indent class rather than nested lists: `listitem` needs
				`list` as its parent, and a wrapper per group would put a plain div between
				them and break the semantics for the sake of a left margin CSS can do.
			*/}
			<div className="ft-agentplan-list" role="list" aria-labelledby={labelId}>
				{rows.map((row) => (
					<div
						key={row.key}
						className={cn(
							"ft-agentplan-row",
							row.depth === 1 && "ft-agentplan-sub",
							row.lastSub && "ft-agentplan-sub-last"
						)}
						role="listitem"
						data-status={row.step.status}
						aria-current={row.index === currentIndex ? "step" : undefined}
					>
						{onSelect ? (
							<button
								type="button"
								className="ft-agentplan-body hover:bg-muted/60 focus-visible:ring-ring flex w-full cursor-pointer items-start gap-2 rounded-md text-left transition-colors focus-visible:ring-1 focus-visible:outline-none"
								onClick={() => selectStep(row.step)}
							>
								<RowBody row={row} item={item} />
							</button>
						) : (
							<div className="ft-agentplan-body flex items-start gap-2 rounded-md">
								<RowBody row={row} item={item} />
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
});
