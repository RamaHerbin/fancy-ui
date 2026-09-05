import { forwardRef, useEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { vibrate } from "../../internals/motion/haptics.js";
import "./status-morph.css";

/** The four states StatusMorph can be in. */
export type StatusMorphState = "idle" | "loading" | "success" | "error";

const DEFAULT_LABELS = { loading: "Loading", success: "Done", error: "Failed" } as const;

interface BaseProps {
	/** Current state. The component only ever writes it back to `"idle"`
	 * itself, when `resetAfter` fires — every other write is the caller's,
	 * and is always honoured: StatusMorph never fights its owner. */
	state?: StatusMorphState;
	/** Called whenever StatusMorph itself writes `state` back to `"idle"`
	 * (the `resetAfter` timer). React has no two-way binding, so a caller
	 * that wants to observe/control the reset wires this into its own
	 * `state`. */
	onStateChange?: (state: StatusMorphState) => void;
	/** Milliseconds until an automatic reset to `"idle"` after `"success"` or
	 * `"error"`. `0` disables the timer entirely (manual reset only). Cleared
	 * whenever `state` changes again — internally or externally — or on
	 * unmount. */
	resetAfter?: number;
	/** Live-region text per state. Unset keys fall back to the defaults. */
	labels?: { loading?: string; success?: string; error?: string };
	/** `"current"` paints every glyph in `currentColor` (matches the
	 * surrounding text/button colour). `"semantic"` reads the AI-family
	 * `--ft-status-running/-done/-error` vocabulary instead — the ring track
	 * stays neutral in both. */
	tone?: "current" | "semantic";
	/** Best-effort tactile feedback (the `success`/`error` haptic patterns)
	 * on entering those states. Opt-in; silently a no-op wherever the
	 * Vibration API is unsupported or refused. */
	haptic?: boolean;
	/** Custom idle content, rendered in the same `calc(1em + 1px)` footprint
	 * instead of the default transparent scaffold — so swapping to it never
	 * shifts layout. */
	idle?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Props for StatusMorph.
 */
export interface StatusMorphProps
	extends BaseProps,
		Omit<HTMLAttributes<HTMLSpanElement>, keyof BaseProps | "className"> {}

export const StatusMorph = forwardRef<HTMLSpanElement, StatusMorphProps>(function StatusMorph(
	{
		state = "idle",
		onStateChange,
		resetAfter = 1800,
		labels = {},
		tone = "current",
		haptic = false,
		idle,
		className,
		...restProps
	},
	ref
) {
	const resolvedLabels = { ...DEFAULT_LABELS, ...labels };

	const liveText =
		state === "loading"
			? resolvedLabels.loading
			: state === "success"
				? resolvedLabels.success
				: state === "error"
					? resolvedLabels.error
					: "";

	// The auto-reset timer for success/error → idle. Keyed on `state` (and
	// `resetAfter`), an effect already gives the exact "clear on any state
	// change" guarantee for free: React tears down the PREVIOUS run's cleanup
	// (which owns the pending `setTimeout`) before the effect body reruns for
	// a new value, so a caller flipping success → error mid-countdown cancels
	// the stale success→idle timer and starts a fresh error→idle one.
	const onStateChangeRef = useRef(onStateChange);
	onStateChangeRef.current = onStateChange;
	useEffect(() => {
		if ((state === "success" || state === "error") && resetAfter > 0) {
			const timer = setTimeout(() => {
				onStateChangeRef.current?.("idle");
			}, resetAfter);
			return () => clearTimeout(timer);
		}
	}, [state, resetAfter]);

	// Best-effort tactile feedback on entering success/error. `vibrate()` is
	// itself a no-op — returns false, never throws — on any environment
	// without a Vibration API or outside a user gesture, so this needs no
	// touch/pointer check of its own; see haptics.ts.
	//
	// `lastHapticState` (a ref, non-reactive) is what makes this fire on
	// TRANSITION into success/error rather than on every run where `haptic`
	// is true: without it, flipping `haptic` false→true while already
	// sitting in `state === "success"` would buzz again with nothing having
	// changed. Mounting straight into success/error is intentionally still a
	// "transition" here, from the effect's own first-run perspective.
	const lastHapticState = useRef<StatusMorphState | undefined>(undefined);
	useEffect(() => {
		const current = state;
		const changed = current !== lastHapticState.current;
		lastHapticState.current = current;
		if (!haptic || !changed) return;
		if (current === "success") vibrate("success");
		else if (current === "error") vibrate("error");
	}, [state, haptic]);

	return (
		<span
			ref={ref}
			className={cn("ft-statusmorph", className)}
			{...restProps}
			data-state={state}
			data-tone={tone}
		>
			{idle ? (
				<span className="ft-statusmorph-idle" aria-hidden="true">
					{idle}
				</span>
			) : null}
			<svg className="ft-statusmorph-svg" viewBox="0 0 24 24" aria-hidden="true" data-state={state}>
				<circle
					className="ft-statusmorph-track"
					cx="12"
					cy="12"
					r="10"
					pathLength="1"
					vectorEffect="non-scaling-stroke"
				/>
				<circle
					className="ft-statusmorph-arc"
					cx="12"
					cy="12"
					r="10"
					pathLength="1"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					className="ft-statusmorph-check"
					d="M7 12.5l3.5 3.5L17 9"
					pathLength="1"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					className="ft-statusmorph-cross-a"
					d="M8 8l8 8"
					pathLength="1"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					className="ft-statusmorph-cross-b"
					d="M16 8l-8 8"
					pathLength="1"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			{/*
				Mounted unconditionally from first render, not conditionally per
				state — a live region has to already exist before its content
				changes for assistive tech to reliably announce the change.
				Portalled to document.body so this text never joins a host
				element's accessible-name computation: rendered as a Button's
				iconStart, an un-portalled span here would make a <button>
				announce "Loading Save changes" instead of "Save changes",
				re-announced on every focus. role="status" stays static; only
				aria-live toggles polite↔assertive for the error case — a live
				aria-live swap is a more consistently supported AT pattern than
				a live role swap.
			*/}
			<Portal>
				<div role="status" aria-live={state === "error" ? "assertive" : "polite"} className="sr-only">
					{liveText}
				</div>
			</Portal>
		</span>
	);
});

StatusMorph.displayName = "StatusMorph";
