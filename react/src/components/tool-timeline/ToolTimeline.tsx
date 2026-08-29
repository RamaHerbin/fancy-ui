import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { formatRelativeTime } from "../../internals/relative-time.js";
import { useNow } from "../../internals/use-elapsed.js";
import type { ToolTimelineItemData } from "../../internals/ai-types.js";
import "./tool-timeline.css";

/**
 * Props for ToolTimeline
 */
export interface ToolTimelineProps {
	/** The agent's activity log, oldest first */
	items: ToolTimelineItemData[];
	/** Called when a row is activated; supplying it turns every row into a button */
	onSelect?: (item: ToolTimelineItemData, index: number) => void;
	/** Replaces the built-in row body, keeping the rail and its dot */
	item?: (item: ToolTimelineItemData, index: number) => ReactNode;
	/** Tighter rows with the detail line dropped */
	compact?: boolean;
	/** Accessible name for the list */
	label?: string;
	/** Additional CSS classes */
	className?: string;
}

function iso(timestamp: Date | number): string {
	const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
	return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

/**
 * ToolTimeline renders an agent's activity log as a vertical rail of dated,
 * diffed rows. A shared clock (`useNow`) keeps relative timestamps fresh
 * while the list stays mounted, at the cost of one interval for the whole
 * list rather than one per row.
 */
export const ToolTimeline = forwardRef<HTMLDivElement, ToolTimelineProps>(function ToolTimeline(
	{ items, onSelect, item, compact = false, label = "Activity", className },
	ref
) {
	const now = useNow();

	return (
		<div
			ref={ref}
			className={cn(
				"ft-tooltimeline w-full text-sm",
				compact && "ft-tooltimeline-compact",
				className
			)}
		>
			<ol className="ft-tooltimeline-list" aria-label={label}>
				{items.map((entry, index) => {
					const body = item ? (
						item(entry, index)
					) : (
						<>
							<span className="ft-tooltimeline-text min-w-0 flex-1">
								<span className="flex min-w-0 items-baseline gap-1.5">
									<span className="ft-tooltimeline-verb font-medium">{entry.verb}</span>
									<span
										className="ft-tooltimeline-target truncate font-mono text-[0.8125rem]"
										title={entry.target}
									>
										{entry.target}
									</span>
								</span>
								{!compact && entry.detail ? (
									<span className="ft-tooltimeline-detail text-muted-foreground mt-0.5 block truncate">
										{entry.detail}
									</span>
								) : null}
							</span>

							<span className="ft-tooltimeline-meta flex shrink-0 items-baseline gap-2">
								{entry.additions != null ? (
									<span
										className="ft-tooltimeline-additions tabular-nums"
										role="img"
										aria-label={`${entry.additions} additions`}
									>
										+{entry.additions}
									</span>
								) : null}
								{entry.deletions != null ? (
									<span
										className="ft-tooltimeline-deletions tabular-nums"
										role="img"
										aria-label={`${entry.deletions} deletions`}
									>
										−{entry.deletions}
									</span>
								) : null}
								{entry.timestamp != null ? (
									<time
										className="ft-tooltimeline-time text-muted-foreground tabular-nums"
										dateTime={iso(entry.timestamp)}
										title={iso(entry.timestamp)}
									>
										{formatRelativeTime(entry.timestamp, { now })}
									</time>
								) : null}
							</span>
						</>
					);

					return (
						<li key={entry.id} className="ft-tooltimeline-row">
							<span className="ft-tooltimeline-dot" aria-hidden="true" />

							{onSelect ? (
								<button
									type="button"
									className="ft-tooltimeline-body hover:bg-muted/60 focus-visible:ring-ring flex w-full cursor-pointer items-baseline gap-3 rounded-md text-left transition-colors focus-visible:ring-1 focus-visible:outline-none"
									onClick={() => onSelect(entry, index)}
								>
									{body}
								</button>
							) : (
								<span className="ft-tooltimeline-body flex items-baseline gap-3 rounded-md">
									{body}
								</span>
							)}
						</li>
					);
				})}
			</ol>
		</div>
	);
});
