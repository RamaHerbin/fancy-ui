import { forwardRef, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import "./approval-card.css";

/** The three states of a human-in-the-loop gate. */
export type ApprovalState = "pending" | "approved" | "denied";

/** Spoken and shown once the gate is behind us. */
const RESOLVED_LABELS = {
	approved: "Approved",
	denied: "Denied",
} as const;

/**
 * Props for ApprovalCard
 */
export interface ApprovalCardProps {
	/** What the agent is asking permission for, e.g. "Run database migration". */
	title: string;
	/** Secondary muted line under the title — the consequence, the blast radius. */
	description?: string;
	/**
	 * Which side of the gate we are on. Controlled when supplied: pair it
	 * with `onStateChange`, the React counterpart of the Svelte source's
	 * `bind:state`. Left out, the card keeps the state itself and starts
	 * at `"pending"`.
	 */
	state?: ApprovalState;
	/** Called with the new state whenever it changes, however the change happened. */
	onStateChange?: (state: ApprovalState) => void;
	/** Marks the action as irreversible: red approve button and a warning tint on the card. */
	destructive?: boolean;
	/** Label for the approve button. */
	approveLabel?: string;
	/** Label for the deny button. */
	denyLabel?: string;
	/**
	 * Called when approve is pressed, with the decision that was just taken
	 * (always `"approved"`). The argument is the point: `onStateChange` has
	 * only just been called at this instant, so a controlled consumer's own
	 * `state` has not re-rendered yet and still reads `"pending"`. The Svelte
	 * source's `bind:state` writes through synchronously and needs no argument;
	 * React does. A `() => void` handler keeps working — it simply ignores it.
	 */
	onApprove?: (state: ApprovalState) => void;
	/** Called when deny is pressed, with the decision (always `"denied"`). See `onApprove`. */
	onDeny?: (state: ApprovalState) => void;
	/** The consumer is executing the decision: both buttons go disabled and the card is `aria-busy`. */
	busy?: boolean;
	/** The detail region between the header and the footer — a diff, a command preview. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * A human-in-the-loop gate: nothing happens until someone presses a button,
 * then the footer collapses to a one-line verdict.
 *
 * The root element arrives through the ref channel rather than a `ref`
 * prop, per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const ApprovalCard = forwardRef<HTMLDivElement, ApprovalCardProps>(function ApprovalCard(
	{
		title,
		description,
		state,
		onStateChange,
		destructive = false,
		approveLabel = "Approve",
		denyLabel = "Deny",
		onApprove,
		onDeny,
		busy = false,
		children,
		className,
	},
	ref
) {
	// `state = $bindable("pending")` on the Svelte side. A supplied prop
	// wins and the consumer owns the value; with nothing supplied the
	// component owns it, starting at the same "pending" default.
	const [uncontrolledState, setUncontrolledState] = useState<ApprovalState>("pending");
	const isControlled = state !== undefined;
	const currentState = isControlled ? state : uncontrolledState;

	const isPending = currentState === "pending";
	const isApproved = currentState === "approved";
	const resolvedLabel = isApproved ? RESOLVED_LABELS.approved : RESOLVED_LABELS.denied;

	/** Where focus lands once the buttons it might have held are gone. */
	const resolvedRef = useRef<HTMLParagraphElement | null>(null);
	const shouldFocusResolved = useRef(false);

	useEffect(() => {
		if (shouldFocusResolved.current) {
			shouldFocusResolved.current = false;
			resolvedRef.current?.focus();
		}
	});

	/**
	 * The decision is written to `state` before the callback fires — and then
	 * handed to the callback as well. In controlled mode `onStateChange` only
	 * *schedules* the consumer's update, so its `state` prop is still
	 * `"pending"` when `onApprove` runs one line later; the argument is the
	 * committed answer it can act on without waiting for its own re-render.
	 * Re-entry is refused rather than re-announced: a gate resolves once.
	 */
	function decide(next: "approved" | "denied") {
		if (busy || currentState !== "pending") return;
		if (!isControlled) {
			setUncontrolledState(next);
		}
		onStateChange?.(next);
		if (next === "approved") onApprove?.(next);
		else onDeny?.(next);
		// The button just pressed is about to leave the DOM along with the
		// rest of the action group, so focus is moved to the verdict once it
		// has painted — otherwise the browser drops it back to the document
		// body.
		shouldFocusResolved.current = true;
	}

	return (
		<div
			ref={ref}
			className={cn(
				"ft-approval border-border bg-card/50 w-full rounded-lg border p-4 text-sm",
				destructive && "ft-destructive",
				className
			)}
			role="group"
			aria-label={title}
			aria-busy={busy ? "true" : undefined}
			data-state={currentState}
		>
			<div className="flex items-start gap-2.5">
				{/*
					Decorative: the title carries the ask in words. On a destructive
					gate the shield picks up an alert mark, so "this one is
					irreversible" is not left to the tint alone.
				*/}
				<span className="ft-approval-icon mt-0.5 flex-none" aria-hidden="true">
					<svg
						className="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						{destructive && (
							<>
								<path d="M12 8v3.5" />
								<path d="M12 15h.01" />
							</>
						)}
					</svg>
				</span>

				<div className="min-w-0 flex-1">
					<p className="ft-approval-title text-foreground font-medium">{title}</p>
					{description && (
						<p className="ft-approval-description text-muted-foreground mt-0.5 text-xs leading-relaxed">
							{description}
						</p>
					)}
				</div>
			</div>

			{children && <div className="ft-approval-detail mt-3 min-w-0">{children}</div>}

			{/*
				One footer element, mounted from the first render, so the live
				region exists before the decision lands in it — a region that
				appears at the same moment as its own text is routinely missed by
				screen readers.
			*/}
			<div className="ft-approval-foot mt-3" aria-live="polite">
				{isPending ? (
					<div className="ft-approval-actions flex flex-wrap items-center justify-end gap-2">
						<button
							type="button"
							className="ft-approval-deny text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-60"
							disabled={busy}
							onClick={() => decide("denied")}
						>
							{denyLabel}
						</button>
						<button
							type="button"
							className={cn(
								"ft-approval-approve bg-foreground text-background hover:bg-foreground/90 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-60",
								destructive && "ft-destructive"
							)}
							disabled={busy}
							onClick={() => decide("approved")}
						>
							{approveLabel}
						</button>
					</div>
				) : (
					<p
						ref={resolvedRef}
						tabIndex={-1}
						className={cn(
							"ft-approval-resolved focus-visible:ring-ring flex items-center gap-1.5 rounded-md text-xs font-medium focus-visible:ring-1 focus-visible:outline-none",
							isApproved && "ft-approved"
						)}
					>
						<span className="flex-none" aria-hidden="true">
							<svg
								className="size-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								{isApproved ? (
									<path d="m20 6-11 11-5-5" />
								) : (
									<>
										<path d="M18 6 6 18" />
										<path d="m6 6 12 12" />
									</>
								)}
							</svg>
						</span>
						{resolvedLabel}
					</p>
				)}
			</div>
		</div>
	);
});

ApprovalCard.displayName = "ApprovalCard";
