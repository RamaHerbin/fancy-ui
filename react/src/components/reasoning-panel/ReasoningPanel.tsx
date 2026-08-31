import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../utils.js";
import { StreamText } from "../../internals/StreamText.js";
import { useAutoscroll } from "../../internals/use-autoscroll.js";
import { formatElapsed, useElapsed } from "../../internals/use-elapsed.js";
import { useFancyId } from "../../internals/use-id.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useInertAttribute } from "../../internals/dom/use-inert-attribute.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import "./reasoning-panel.css";

/**
 * Props for ReasoningPanel
 */
export interface ReasoningPanelProps {
	/** The reasoning trace so far. Hand over a longer string to stream more in. */
	text: string;
	/** Whether the trace is still growing. Drives the timer, the shimmer, and autoscroll. */
	streaming?: boolean;
	/**
	 * Whether the trace is expanded. Left alone until either the component or
	 * the reader changes it — see the open-behaviour contract in the README. A
	 * changed prop value is adopted as the new state and announced through
	 * `onToggle`, the counterpart of a consumer writing to the bound variable
	 * on the Svelte side.
	 */
	open?: boolean;
	/** Header text. */
	label?: string;
	/** Epoch ms the current burst started at. Pins the live timer's origin. */
	since?: number;
	/** Final duration for the summary line. Falls back to what the timer measured. */
	durationMs?: number;
	/** Scroll height of the trace once expanded. */
	maxHeight?: string;
	/** Called whenever the panel opens or closes, by click or on its own. */
	onToggle?: (open: boolean) => void;
	/** Additional CSS classes */
	className?: string;
}

/** How long a finished trace stays on screen before folding itself away. */
const AUTO_COLLAPSE_MS = 600;

/**
 * ReasoningPanel
 */
export const ReasoningPanel = forwardRef<HTMLDivElement, ReasoningPanelProps>(
	function ReasoningPanel(
		{
			text,
			streaming = false,
			open: openProp,
			label = "Reasoning",
			since,
			durationMs,
			maxHeight = "12rem",
			onToggle,
			className,
		},
		ref
	) {
		const uid = useFancyId();
		const headerId = `${uid}-header`;
		const bodyId = `${uid}-body`;

		// `open` stays undefined until something actually decides: `autoOpen`
		// carries the answer in the meantime, so a consumer that never touches
		// the prop still gets the automatic behaviour and one that drives it
		// still owns the value.
		const [openState, setOpenState] = useState<boolean | undefined>(openProp);
		const [autoOpen, setAutoOpen] = useState(false);
		const [measuredMs, setMeasuredMs] = useState(0);

		// A changed `open` prop is a consumer decision: adopt it during render,
		// the way a write to the bound variable lands on the Svelte side.
		const lastOpenProp = useRef(openProp);
		if (openProp !== lastOpenProp.current) {
			lastOpenProp.current = openProp;
			if (openProp !== openState) setOpenState(openProp);
		}

		const isOpen = openState ?? autoOpen;

		// Plain refs: none of these should wake an effect that writes them.
		const isOpenRef = useRef(isOpen);
		isOpenRef.current = isOpen;
		const userToggled = useRef(false);
		const wasStreaming = useRef(false);
		const collapseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
		// The last value `onToggle` was told about. `commit` keeps it in step
		// with its own calls, so the effect below only speaks up for changes
		// that never went through it — a consumer rewriting the `open` prop.
		const lastNotifiedOpen = useRef(isOpen);

		const elapsed = useElapsed();
		const elapsedMsRef = useRef(elapsed.ms);
		elapsedMsRef.current = elapsed.ms;
		const { start: startElapsed, stop: stopElapsed } = elapsed;

		const duration = durationMs ?? measuredMs;
		const summary = streaming
			? formatElapsed(elapsed.ms)
			: duration > 0
				? `Thought for ${formatElapsed(duration)}`
				: "";

		function clearCollapseTimer() {
			if (collapseTimer.current !== undefined) {
				clearTimeout(collapseTimer.current);
				collapseTimer.current = undefined;
			}
		}

		const commit = useEventCallback((next: boolean) => {
			if (isOpenRef.current === next) return;
			isOpenRef.current = next;
			setOpenState(next);
			setAutoOpen(next);
			lastNotifiedOpen.current = next;
			onToggle?.(next);
		});

		function toggle() {
			// From here on the reader owns the panel: no more opening or closing
			// on its own behind their back.
			userToggled.current = true;
			clearCollapseTimer();
			commit(!isOpenRef.current);
		}

		// Open on the first chunk, fold away a beat after the last one — until
		// the reader takes over. `userToggled` is a ref so that taking over
		// does not itself re-run this.
		useEffect(() => {
			clearCollapseTimer();
			if (streaming) {
				wasStreaming.current = true;
				if (!userToggled.current) commit(true);
				return clearCollapseTimer;
			}
			if (!wasStreaming.current) return clearCollapseTimer;
			wasStreaming.current = false;
			if (userToggled.current) return clearCollapseTimer;
			collapseTimer.current = setTimeout(() => {
				collapseTimer.current = undefined;
				commit(false);
			}, AUTO_COLLAPSE_MS);
			return clearCollapseTimer;
		}, [streaming, commit]);

		// A consumer that rewrites the `open` prop moves the panel without going
		// through `commit`, so nothing above reports it. The README promises
		// every change is announced, whichever side caused it.
		const notifyToggle = useEventCallback(onToggle);
		useEffect(() => {
			if (isOpen === lastNotifiedOpen.current) return;
			lastNotifiedOpen.current = isOpen;
			notifyToggle(isOpen);
		}, [isOpen, notifyToggle]);

		// The timer only exists while the trace grows; its last reading survives
		// as the summary duration.
		useEffect(() => {
			if (!streaming) return;
			startElapsed(since ?? Date.now());
			return () => {
				setMeasuredMs(elapsedMsRef.current);
				stopElapsed();
			};
		}, [streaming, since, startElapsed, stopElapsed]);

		const [bodyEl, bodyRef] = useElementRef<HTMLDivElement>();
		const inertRef = useInertAttribute<HTMLDivElement>(!isOpen);
		const composedBodyRef = useComposedRefs<HTMLDivElement>(bodyRef, inertRef);
		useAutoscroll(bodyEl, { enabled: streaming && isOpen, pinOnConnect: true });

		return (
			<div
				ref={ref}
				className={cn(
					"fancy-reasoning-panel border-border bg-card/50 w-full rounded-lg border text-sm",
					className
				)}
			>
				<button
					type="button"
					id={headerId}
					className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
					aria-expanded={isOpen}
					aria-controls={bodyId}
					onClick={toggle}
				>
					<svg
						className={cn("ft-chevron size-3.5 shrink-0", isOpen && "ft-open")}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="m9 6 6 6-6 6" />
					</svg>
					<span className={cn("text-foreground font-medium", streaming && "ft-shimmer")}>
						{label}
					</span>
					{summary ? <span className="ml-auto text-xs tabular-nums">{summary}</span> : null}
				</button>

				<div className={cn("ft-body", isOpen && "ft-open")}>
					<div className="overflow-hidden">
						{/*
							`inert` goes straight to the node through `useInertAttribute`, never
							as a JSX prop: React 18 drops `inert={true}` and React 19 rejects
							`inert=""`, so no single prop spelling covers this package's peer
							range. The hook emits the same attribute on both.
						*/}
						<div
							ref={composedBodyRef}
							id={bodyId}
							role="group"
							aria-labelledby={headerId}
							className="text-muted-foreground overflow-y-auto px-3 pb-3 leading-relaxed"
							style={{ maxHeight }}
						>
							<StreamText text={text} />
						</div>
					</div>
				</div>
			</div>
		);
	}
);
