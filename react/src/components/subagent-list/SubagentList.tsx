import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import type { RunStatus, SubagentData } from "../../internals/ai-types.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./subagent-list.css";

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

interface Row {
	agent: SubagentData;
	index: number;
	key: string;
}

/**
 * The first worker under an id keeps that id as its key, so a row survives a
 * reorder with its DOM node intact; only a repeat is suffixed, and by
 * occurrence rather than position, which would rename every row below an
 * insertion. The suffix also clears the ids actually in the list, since a
 * worker may genuinely be called "x#1" while two others are called "x".
 */
function buildRows(agents: SubagentData[]): Row[] {
	const ids = new Set(agents.map((agent) => agent.id));
	const seen = new Map<string, number>();
	const used = new Set<string>();
	return agents.map((agent, index) => {
		const occurrence = seen.get(agent.id) ?? 0;
		seen.set(agent.id, occurrence + 1);
		let key = agent.id;
		if (occurrence > 0) {
			let suffix = occurrence;
			do {
				key = `${agent.id}#${suffix}`;
				suffix++;
			} while (ids.has(key) || used.has(key));
		}
		used.add(key);
		return { agent, index, key };
	});
}

function RowBody({
	agent,
	index,
	compact,
	onSelect,
	item,
}: {
	agent: SubagentData;
	index: number;
	compact: boolean;
	onSelect?: (agent: SubagentData, index: number) => void;
	item?: (agent: SubagentData, index: number) => ReactNode;
}) {
	return (
		<>
			{/*
				Filled versus hollow, not just hue: the five states stay apart for
				anyone who cannot tell the colours apart, and the row says which
				one it is in words beside it.
			*/}
			<span
				className={cn(
					"ft-subagents-dot",
					agent.status === "pending" && "ft-status-pending",
					agent.status === "running" && "ft-status-running",
					agent.status === "done" && "ft-status-done",
					agent.status === "error" && "ft-status-error",
					agent.status === "cancelled" && "ft-status-cancelled"
				)}
				aria-hidden="true"
			></span>

			{item ? (
				<>
					<span className="sr-only">{STATUS_LABELS[agent.status]}</span>
					{item(agent, index)}
				</>
			) : (
				<>
					<span className="ft-subagents-main min-w-0 flex-1">
						<span className="flex min-w-0 items-baseline gap-1.5">
							<span className="ft-subagents-name truncate font-medium" title={agent.name}>
								{agent.name}
							</span>
							{agent.model ? (
								// `text-foreground/70` rather than `text-muted-foreground`: at
								// 10px the badge is not large text, so it owes 4.5:1, and the
								// muted token only reaches 4.33:1 on a light page. Seventy
								// percent of the foreground clears it on both themes.
								<span className="ft-subagents-model text-foreground/70 shrink-0 font-mono">
									{agent.model}
								</span>
							) : null}
						</span>
						{!compact && agent.task ? (
							<span
								className="ft-subagents-task text-muted-foreground mt-0.5 block truncate"
								title={agent.task}
							>
								{agent.task}
							</span>
						) : null}
					</span>

					<span className="ft-subagents-meta flex shrink-0 items-center">
						{showsProgress(agent) ? (
							(() => {
								const value = percent(agent.progress);
								return (
									<>
										{onSelect ? (
											// Only needed inside the selectable row's button: a `progressbar`
											// is a range role, so its own value feeds the button's accessible
											// name instead of being announced on its own, and these words are
											// what makes that name legible. A standalone row keeps the
											// `progressbar` as its own object, independently announced with
											// its label and value — this text would only repeat it.
											<span className="sr-only">
												{STATUS_LABELS[agent.status]}, {value}%
											</span>
										) : null}
										<span
											className="ft-subagents-progress"
											role="progressbar"
											aria-label={STATUS_LABELS.running}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-valuenow={value}
										>
											<span
												className="ft-subagents-progress-fill"
												style={{ width: `${value}%` }}
											></span>
										</span>
									</>
								);
							})()
						) : (
							<span className="ft-subagents-state text-muted-foreground">
								{STATUS_WORDS[agent.status]}
							</span>
						)}
					</span>
				</>
			)}
		</>
	);
}

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
	item?: (agent: SubagentData, index: number) => ReactNode;
	/** Tighter rows with the task line dropped */
	compact?: boolean;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off
	 * by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

export const SubagentList = forwardRef<HTMLDivElement, SubagentListProps>(function SubagentList(
	{ agents, label, onSelect, item, compact = false, className, sound = false },
	ref
) {
	const playCue = useSoundCue(sound);
	const runningCount = agents.filter((agent) => agent.status === "running").length;
	const allFinished = agents.length > 0 && agents.every((agent) => isFinished(agent.status));

	/**
	 * A fan-out is read for one number: how many workers are still out there. So
	 * the running count leads while anything runs, and gives way to the total once
	 * the last one lands. Anything in between — queued, nothing started — is just
	 * the headcount, since "0 agents running" tells the reader nothing they want.
	 */
	const autoLabel = (() => {
		const total = agents.length;
		if (total === 0) return "No agents";
		if (runningCount > 0) return `${runningCount} ${noun(runningCount)} running`;
		if (allFinished) return `${total} ${noun(total)} finished`;
		return `${total} ${noun(total)}`;
	})();

	const listLabel = label ?? autoLabel;
	const rows = buildRows(agents);

	/** A row activation is a fresh gesture every time — mounting a new row or a
	 *  status change never routes through here, only an actual pick does. */
	function selectAgent(agent: SubagentData, index: number) {
		playCue("select");
		onSelect?.(agent, index);
	}

	return (
		<div ref={ref} className={cn("ft-subagents w-full text-sm", compact && "ft-subagents-compact", className)}>
			{/*
				`role="list"` is stated rather than left implicit: `list-style: none` strips
				list semantics in Safari, and the count of workers is the point of this list.
			*/}
			<ul className="ft-subagents-list" role="list" aria-label={listLabel}>
				{rows.map(({ agent, index, key }) => (
					<li className="ft-subagents-row" key={key}>
						{onSelect ? (
							<button
								type="button"
								className="ft-subagents-body hover:bg-muted/60 focus-visible:ring-ring flex w-full cursor-pointer items-start gap-2.5 rounded-md text-left transition-colors focus-visible:ring-1 focus-visible:outline-none"
								onClick={() => selectAgent(agent, index)}
							>
								<RowBody agent={agent} index={index} compact={compact} onSelect={onSelect} item={item} />
							</button>
						) : (
							<span className="ft-subagents-body flex w-full items-start gap-2.5 rounded-md">
								<RowBody agent={agent} index={index} compact={compact} item={item} />
							</span>
						)}
					</li>
				))}
			</ul>
		</div>
	);
});
