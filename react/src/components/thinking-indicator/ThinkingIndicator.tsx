import { forwardRef, useEffect, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { formatElapsed, useElapsed } from "../../internals/use-elapsed.js";
import "./thinking-indicator.css";

/**
 * Props for ThinkingIndicator
 */
export interface ThinkingIndicatorProps {
	/** What the agent is doing right now, e.g. "Reading files" */
	status: string;
	/** Whether the activity is still in flight: drives the shimmer and the live timer */
	running?: boolean;
	/** `"inline"` is a bare text row; `"pill"` is a bordered chip with a leading pulse dot */
	variant?: "inline" | "pill";
	/** Epoch ms the activity started; the internal stopwatch ticks from it */
	since?: number;
	/** Externally-driven elapsed time in ms; overrides the internal stopwatch */
	elapsedMs?: number;
	/** Show the elapsed duration alongside the status */
	showElapsed?: boolean;
	/** Rendered instead of the status label once `running` is false */
	done?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * ThinkingIndicator
 */
export const ThinkingIndicator = forwardRef<HTMLDivElement, ThinkingIndicatorProps>(
	function ThinkingIndicator(
		{ status, running = true, variant = "inline", since, elapsedMs, showElapsed = true, done, className },
		ref
	) {
		// Seeded at zero rather than from `since`: reading the wall clock during
		// render would happen once on the server and again at hydration, and the
		// two can land on different seconds, leaving the `<time>` text and its
		// `datetime` disagreeing with the markup being hydrated. The effect below
		// reads the real elapsed time immediately after mounting — client-only —
		// so a row that mounts already finished stays at 0s, which is what the
		// README documents for that case.
		const elapsed = useElapsed();

		// `start` returns its own stop function, which doubles as the effect
		// cleanup: flipping `running` off, swapping in an external `elapsedMs`, or
		// changing `since` all tear the interval down before the next run starts a
		// new one.
		const { start } = elapsed;
		useEffect(() => {
			if (running && since !== undefined && elapsedMs === undefined) return start(since);
		}, [running, since, elapsedMs, start]);

		const hasElapsed = elapsedMs !== undefined || since !== undefined;
		const effectiveMs = elapsedMs ?? elapsed.ms;
		const elapsedText = formatElapsed(effectiveMs);
		// ISO 8601 duration, so the value is machine-readable and not just decorative.
		const elapsedDateTime = `PT${Math.max(0, Math.floor(effectiveMs / 1000))}S`;
		const showDone = !running && done !== undefined;

		return (
			<div
				ref={ref}
				className={cn(
					"ft-thinking inline-flex items-center gap-2 text-sm",
					variant === "pill" && "ft-thinking-pill bg-background/60 rounded-full border px-3 py-1",
					className
				)}
				role="status"
				aria-live="polite"
			>
				{variant === "pill" && (
					<span
						className={cn("ft-thinking-dot", running && "ft-thinking-dot-live")}
						aria-hidden="true"
					></span>
				)}

				{showDone ? (
					<span className="ft-thinking-done text-muted-foreground">{done}</span>
				) : (
					<span className={cn("ft-thinking-label text-foreground", running && "ft-thinking-shimmer")}>
						{status}
					</span>
				)}

				{showElapsed && hasElapsed && (
					/*
						While the timer ticks it is hidden from assistive tech: inside a polite
						live region a visible second counter would otherwise be announced once
						per second. It becomes readable again the moment the activity stops.
					*/
					<time
						className="ft-thinking-elapsed text-muted-foreground tabular-nums"
						dateTime={elapsedDateTime}
						aria-hidden={running ? "true" : undefined}
					>
						{elapsedText}
					</time>
				)}
			</div>
		);
	}
);
