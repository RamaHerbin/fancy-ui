import { forwardRef, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { cn } from "../../utils.js";
import { NumberTicker } from "../number-ticker/index.js";
import "./recommendation-card.css";

/** Where a proposal stands: still on the table, taken up, or waved off. */
export type RecommendationState = "open" | "accepted" | "dismissed";

/** Shown and spoken once the proposal is behind us. */
const RESOLVED_LABELS = {
	accepted: "Applied",
	dismissed: "Dismissed",
} as const;

/** How long the percentage takes to count up, before the reduced-motion clamp. */
const TICKER_MS = 900;

/** Ring geometry. The radius picks the circumference the dash array runs on. */
const RING_R = 13;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Props for RecommendationCard
 */
export interface RecommendationCardProps {
	/** What the agent is proposing, e.g. "Add an index on orders.customer_id". */
	title: string;
	/** Secondary muted line under the title — the reasoning, the expected effect. */
	description?: string;
	/**
	 * How sure the agent is, from 0 to 1. Omitted, the whole confidence block
	 * disappears rather than reading as zero. Out-of-range numbers are clamped.
	 */
	confidence?: number;
	/** Label for the confirm button. */
	acceptLabel?: string;
	/** Label for the decline button. */
	dismissLabel?: string;
	/** Called when the recommendation is accepted, after `state` has been written. */
	onAccept?: () => void;
	/** Called when the recommendation is dismissed, after `state` has been written. */
	onDismiss?: () => void;
	/**
	 * Where the recommendation stands. Controlled when supplied: pair it with
	 * `onStateChange`, the React counterpart of the Svelte source's `bind:state`.
	 * Left out, the card keeps the state itself and starts at `"open"`.
	 */
	state?: RecommendationState;
	/** Called with the new state whenever it changes, however the change happened. */
	onStateChange?: (state: RecommendationState) => void;
	/** Small kicker above the title, e.g. "Suggestion". */
	badge?: string;
	/** The detail region between the header and the footer — a preview of the change. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * A proposal an agent puts on the table: a title, an optional confidence ring
 * that sweeps to its figure, and a footer that collapses to a one-line verdict
 * once someone answers.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const RecommendationCard = forwardRef<HTMLDivElement, RecommendationCardProps>(
	function RecommendationCard(
		{
			title,
			description,
			confidence,
			acceptLabel = "Apply",
			dismissLabel = "Dismiss",
			onAccept,
			onDismiss,
			state,
			onStateChange,
			badge,
			children,
			className,
			sound = false,
		},
		ref
	) {
		// `state = $bindable("open")` on the Svelte side. A supplied prop wins and
		// the consumer owns the value; with nothing supplied the component owns it,
		// starting at the same "open" default.
		const [uncontrolledState, setUncontrolledState] = useState<RecommendationState>("open");
		const isControlled = state !== undefined;
		const current = isControlled ? state : uncontrolledState;

		const isOpen = current === "open";
		const resolvedLabel =
			current === "accepted" ? RESOLVED_LABELS.accepted : RESOLVED_LABELS.dismissed;

		// A missing confidence is not a confidence of zero: the block only exists for
		// a real number, so `NaN` and `Infinity` are treated as "not reported".
		const hasConfidence = typeof confidence === "number" && Number.isFinite(confidence);
		const fraction = hasConfidence ? Math.min(1, Math.max(0, confidence as number)) : 0;
		const percent = Math.round(fraction * 100);

		/** Three bands, borrowing the run-status vocabulary the AI family already shares. */
		const band = fraction >= 0.75 ? "done" : fraction >= 0.5 ? "running" : "pending";

		const [filled, setFilled] = useState(false);
		const [reduced, setReduced] = useState(false);

		const playCue = useSoundCue(sound);

		// `current` inside `decide` is the value of the render that built the
		// closure, so two clicks dispatched in one synchronous batch would both read
		// "open" and resolve the proposal twice. The ref carries the answer across
		// that gap, and is put back in step with `current` on every commit so a
		// proposal reopened from outside can be answered again.
		const currentRef = useRef<RecommendationState>(current);
		useIsomorphicLayoutEffect(() => {
			currentRef.current = current;
		}, [current]);

		/** Where focus lands once the buttons it might have held are gone. */
		const resolvedRef = useRef<HTMLParagraphElement | null>(null);
		const shouldFocusResolved = useRef(false);

		// The ring starts empty and fills once the target is written, so its sweep runs
		// from a known origin — a transition never animates from a value the browser
		// has not painted yet.
		const sweep = filled ? fraction : 0;
		const ringOffset = RING_C * (1 - sweep);

		// The counter is JS-driven, so reduced motion is honoured by collapsing its
		// duration rather than by a media query: it lands on the number immediately.
		const tickerMs = Math.max(0.01, reduced ? 0 : TICKER_MS);

		// A layout effect, not a passive one: the reduced-motion branch below writes
		// the settled arc, and it has to land in the commit that mounts the card or
		// the browser paints the empty ring for a frame first — the very artefact
		// the branch exists to remove.
		useIsomorphicLayoutEffect(() => {
			const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			setReduced(isReduced);

			// Reduced motion wants the settled arc, not a fast one: write it in the same
			// breath so there is never a frame of empty ring to notice.
			if (isReduced) {
				setFilled(true);
				return;
			}

			// The mount effect still runs inside the frame that mounted the card, so
			// setting the target here would land in the same paint as the empty ring and
			// the browser would have nothing to transition between. Two frames out is the
			// guarantee: the first callback can still belong to the mounting frame, the
			// second cannot, so the empty ring is on screen before the target is written.
			let second = 0;
			const first = requestAnimationFrame(() => {
				second = requestAnimationFrame(() => {
					setFilled(true);
				});
			});

			return () => {
				cancelAnimationFrame(first);
				cancelAnimationFrame(second);
			};
		}, []);

		// The button just pressed is about to leave the DOM along with the rest of the
		// action group, so focus is moved to the verdict once it has painted —
		// otherwise the browser drops it back to the document body.
		useEffect(() => {
			if (shouldFocusResolved.current) {
				shouldFocusResolved.current = false;
				resolvedRef.current?.focus();
			}
		});

		/**
		 * The answer is written to `state` before the callback fires, so a consumer
		 * reading the controlled value from inside its own handler already sees it.
		 * Re-entry is refused rather than re-announced: a proposal resolves once.
		 */
		function decide(next: "accepted" | "dismissed") {
			if (currentRef.current !== "open") return;
			currentRef.current = next;
			if (!isControlled) {
				setUncontrolledState(next);
			}
			onStateChange?.(next);
			// The deliberate asymmetry with ApprovalCard: accepting is a commit
			// (`select`), dismissing is a close (`close`), never `error` either way.
			playCue(next === "accepted" ? "select" : "close");
			if (next === "accepted") onAccept?.();
			else onDismiss?.();
			shouldFocusResolved.current = true;
		}

		return (
			<div
				ref={ref}
				className={cn(
					"ft-rec border-border w-full rounded-lg border p-4 text-sm",
					isOpen && "bg-card/50",
					className
				)}
				role="group"
				aria-label={title}
				data-state={current}
			>
				<div className="flex items-start gap-3">
					<div className="min-w-0 flex-1">
						{badge && (
							<p className="ft-rec-badge text-muted-foreground mb-1 text-[0.6875rem] font-medium uppercase">
								{badge}
							</p>
						)}
						<p className="ft-rec-title text-foreground font-medium">{title}</p>
						{description && (
							<p className="ft-rec-description text-muted-foreground mt-0.5 text-xs leading-relaxed">
								{description}
							</p>
						)}
					</div>

					{hasConfidence && (
						/*
							One label for the pair: the counter is mid-animation for most of its
							life and the ring says nothing out loud, so assistive tech is given the
							settled figure once and both halves are hidden behind it.
						*/
						<div
							className="ft-rec-confidence flex flex-none items-center gap-2"
							role="img"
							aria-label={`Confidence ${percent}%`}
							data-band={band}
						>
							<span
								className="ft-rec-percent text-foreground text-xs font-medium tabular-nums"
								aria-hidden="true"
							>
								<NumberTicker
									value={percent}
									duration={tickerMs}
									className="text-inherit dark:text-inherit"
								/>
								%
							</span>

							<svg className="ft-rec-ring" viewBox="0 0 32 32" aria-hidden="true">
								<circle
									className="ft-rec-ring-track"
									cx="16"
									cy="16"
									r={RING_R}
									fill="none"
									strokeWidth="3"
								/>
								<circle
									className={cn(
										"ft-rec-ring-value",
										band === "done" && "ft-status-done",
										band === "running" && "ft-status-running",
										band === "pending" && "ft-status-pending"
									)}
									cx="16"
									cy="16"
									r={RING_R}
									fill="none"
									strokeWidth="3"
									strokeLinecap="round"
									strokeDasharray={RING_C}
									strokeDashoffset={ringOffset}
									transform="rotate(-90 16 16)"
								/>
							</svg>
						</div>
					)}
				</div>

				{/*
					Nullish and boolean children mean "no detail region"; every other
					value renders inside the wrapper, so a numeric `0` cannot leak out
					as bare text the way a plain truthiness test would let it.
				*/}
				{children != null && children !== false && (
					<div className="ft-rec-detail mt-3 min-w-0">{children}</div>
				)}

				{/*
					One footer element, mounted from the first render, so the live region
					exists before the outcome lands in it — a region that appears at the same
					moment as its own text is routinely missed by screen readers.
				*/}
				<div className="ft-rec-foot mt-3" aria-live="polite">
					{isOpen ? (
						<div className="ft-rec-actions flex flex-wrap items-center justify-end gap-2">
							<button
								type="button"
								className="ft-rec-dismiss text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
								onClick={() => decide("dismissed")}
							>
								{dismissLabel}
							</button>
							<button
								type="button"
								className="ft-rec-accept bg-foreground text-background hover:bg-foreground/90 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
								onClick={() => decide("accepted")}
							>
								{acceptLabel}
							</button>
						</div>
					) : (
						<p
							ref={resolvedRef}
							tabIndex={-1}
							className={cn(
								"ft-rec-resolved focus-visible:ring-ring flex items-center gap-1.5 rounded-md text-xs font-medium focus-visible:ring-1 focus-visible:outline-none",
								current === "accepted" && "ft-accepted"
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
									{current === "accepted" ? (
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
	}
);

RecommendationCard.displayName = "RecommendationCard";
