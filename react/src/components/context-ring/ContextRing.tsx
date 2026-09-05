import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useFancyId } from "../../internals/use-id.js";
import { useFloat } from "../../internals/use-float.js";
import { useSoundCue } from "../../sound/use-sound.js";
import type { FloatRect } from "../../internals/float.js";
import type { TokenUsageData } from "../../internals/ai-types.js";
import "./context-ring.css";

/**
 * Props for ContextRing
 */
export interface ContextRingProps {
	/** Context-window consumption: how many tokens are used, out of how many, and of what. */
	usage: TokenUsageData;
	/** Outer diameter of the ring, in pixels. */
	size?: number;
	/** Thickness of both the track and the arc, in pixels. */
	strokeWidth?: number;
	/** Whether the compact "12.4k / 200k" figure is shown beside the ring. */
	showLabel?: boolean;
	/** Fraction at which the ring leaves the quiet band, 0–1. */
	warnAt?: number;
	/** Fraction at which the ring turns to the error colour, 0–1. */
	criticalAt?: number;
	/** Accessible name for the meter — what this ring is measuring. */
	label?: string;
	/** Whether clicking the ring opens a popover listing `usage.breakdown`. */
	expandable?: boolean;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/** Shown in the popover when a caller asked for one but sent no rows. */
const NO_BREAKDOWN = "No breakdown reported.";

// -----------------------------------------------------------------------------
// Numbers
// -----------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, max));
}

/** A fraction prop that arrived as nonsense falls back rather than poisoning the bands. */
function fractionProp(value: number, fallback: number): number {
	return Number.isFinite(value) ? clamp(value, 0, 1) : fallback;
}

/**
 * The ring's own tiny formatter, deliberately not `Intl.NumberFormat`'s compact
 * notation: that rounds 12,400 to "12K" and drops the digit the reader is
 * actually watching. Below a thousand the count is exact, below a hundred
 * thousand it keeps one decimal, and above that the decimal is noise on a
 * figure nobody reads that precisely. A whole number never carries a hanging
 * ".0" — "1k", not "1.0k".
 */
function compact(value: number): string {
	if (!Number.isFinite(value)) return "0";
	const n = Math.max(0, Math.round(value));
	if (n < 1000) return String(n);
	if (n < 100_000) {
		const fixed = (n / 1000).toFixed(1);
		return `${fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed}k`;
	}
	return `${Math.round(n / 1000)}k`;
}

/** The spoken figure is grouped in full, because "12.4k" is a glance, not a reading. */
function grouped(value: number): string {
	return Math.max(0, Math.round(Number.isFinite(value) ? value : 0)).toLocaleString("en-US");
}

/**
 * ContextRing
 */
export const ContextRing = forwardRef<HTMLDivElement, ContextRingProps>(function ContextRing(
	{
		usage,
		size = 28,
		strokeWidth = 3,
		showLabel = true,
		warnAt = 0.75,
		criticalAt = 0.9,
		label = "Context usage",
		expandable = false,
		className,
		sound = false,
	},
	forwardedRef
) {
	const uid = useFancyId();
	const panelId = `${uid}-breakdown`;

	// Plain refs, not `useElementRef` (the exception convention C-1 carves out):
	// both elements are rendered unconditionally for the configuration that uses
	// them and the nodes are only ever read inside an event handler or the float
	// anchor getter, never by a hook keyed on their arrival.
	const rootRef = useRef<HTMLDivElement | null>(null);
	const composedRootRef = useComposedRefs(forwardedRef, rootRef);

	const playCue = useSoundCue(sound);

	// -------------------------------------------------------------------------
	// Numbers
	// -------------------------------------------------------------------------

	const used = Number.isFinite(usage.used) ? Math.max(0, usage.used) : 0;
	// A budget of zero — or of nothing at all — is an empty ring, not a division.
	const max = Number.isFinite(usage.max) && usage.max > 0 ? usage.max : 0;
	const fraction = max > 0 ? Math.min(1, used / max) : 0;

	// `criticalAt` is floored at `warnAt` so a caller who swaps the two gets a ring
	// that still escalates in one direction instead of one band that can never win.
	const warn = fractionProp(warnAt, 0.75);
	const critical = Math.max(warn, fractionProp(criticalAt, 0.9));
	const band = fraction >= critical ? "critical" : fraction >= warn ? "warn" : "ok";

	const labelText = `${compact(used)} / ${compact(max)}`;
	// Over budget pins the meter at its maximum, which is what `aria-valuenow` is
	// allowed to say; the text beside it still reports the real figure.
	const valueNow = Math.round(Math.min(used, max));
	const valueMax = Math.round(max);
	const valueText = `${grouped(used)} of ${grouped(max)} tokens`;

	const rows = usage.breakdown ?? [];

	// -------------------------------------------------------------------------
	// Geometry
	// -------------------------------------------------------------------------

	const px = Number.isFinite(size) ? Math.max(8, size) : 28;
	// The stroke is centred on the radius, so it cannot be wider than the ring has
	// room for — past that the arc eats its own centre and the shape stops reading.
	const stroke = clamp(
		Number.isFinite(strokeWidth) ? strokeWidth : 3,
		0.5,
		Math.max(0.5, px / 2 - 0.5)
	);
	const centre = px / 2;
	const radius = Math.max(0.5, (px - stroke) / 2);
	const circumference = 2 * Math.PI * radius;

	// The ring is painted empty and its target written a frame later, so the sweep
	// runs from a value the browser has already put on screen. Everything the meter
	// *means* — its value, its text, its band — is derived above and needs no mount,
	// so a server render is exact and only the entrance waits for the client.
	const [filled, setFilled] = useState(false);
	const sweep = filled ? fraction : 0;
	const dashOffset = circumference * (1 - sweep);

	useIsomorphicLayoutEffect(() => {
		// Reduced motion wants the settled arc, not a fast one: write it in the same
		// breath so there is never a frame of empty ring to notice.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setFilled(true);
			return;
		}

		// The mount effect still runs inside the frame that mounted the ring, so
		// setting the target here would land in the same paint as the empty arc and
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

	// -------------------------------------------------------------------------
	// Breakdown popover
	// -------------------------------------------------------------------------

	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	// The open flag as the handlers read it, written in the same breath as the
	// state so a second dismissal in the same tick is already guarded — the
	// state itself is a render behind until React flushes.
	const openRef = useRef(false);

	// One place every dismissal funnels through, so the toggle, Escape and an
	// outside pointerdown all give exactly one `close` cue rather than each
	// wiring its own.
	const close = useCallback(() => {
		if (!openRef.current) return;
		openRef.current = false;
		setOpen(false);
		playCue("close");
	}, [playCue]);

	const toggle = useCallback(() => {
		if (!openRef.current) {
			openRef.current = true;
			setOpen(true);
			playCue("open");
			return;
		}
		close();
	}, [close, playCue]);

	// Taking expandability away takes the panel with it. Left open, it would keep
	// its window listeners with no trigger on screen, and turning expandability
	// back on would reopen a panel nobody asked to see again. Bookkeeping rather
	// than a dismissal, so it writes the flag directly and stays silent.
	useEffect(() => {
		if (!expandable) {
			openRef.current = false;
			setOpen(false);
		}
	}, [expandable]);

	// Escape and a click elsewhere both dismiss. Bound to the window rather than to
	// the panel so they work whether or not anything inside it holds focus; the
	// listeners exist only while the panel does.
	useEffect(() => {
		if (!open) return;

		const onKeydown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			close();
			// Focus goes back to what opened the panel, not to the top of the page.
			triggerRef.current?.focus();
		};
		const onPointerDown = (event: Event) => {
			const target = event.target as Node | null;
			if (target && rootRef.current?.contains(target)) return;
			close();
		};

		window.addEventListener("keydown", onKeydown);
		window.addEventListener("pointerdown", onPointerDown, true);
		return () => {
			window.removeEventListener("keydown", onKeydown);
			window.removeEventListener("pointerdown", onPointerDown, true);
		};
	}, [open, close]);

	// The anchor is read through a getter so the float re-measures the trigger on
	// every scroll and resize tick rather than holding a stale rect.
	// Identity-stable, so the float is never re-synced for the getter alone.
	const anchor = useCallback(
		(): FloatRect | null => triggerRef.current?.getBoundingClientRect() ?? null,
		[]
	);
	// In the DOM only while it is on screen, so the hook is handed `null` — and
	// does nothing at all — for as long as the panel is closed.
	const [panelEl, panelRef] = useElementRef<HTMLDivElement>();
	useFloat(panelEl, { anchor, placement: "bottom-end", offset: 8 });

	/*
	 * One `meter` for the pair: the arc says nothing out loud and the compact figure
	 * is a glance rather than a reading, so assistive tech is given the full count
	 * once through `aria-valuetext` and both halves are hidden behind it.
	 */
	const face = (
		<>
			<span
				className="ft-ctxring-meter inline-flex flex-none"
				role="meter"
				aria-label={label}
				aria-valuenow={valueNow}
				aria-valuemin={0}
				aria-valuemax={valueMax}
				aria-valuetext={valueText}
			>
				<svg
					className="ft-ctxring-ring"
					viewBox={`0 0 ${px} ${px}`}
					style={{ width: `${px}px`, height: `${px}px` }}
					aria-hidden="true"
				>
					<circle
						className="ft-ctxring-track"
						cx={centre}
						cy={centre}
						r={radius}
						fill="none"
						strokeWidth={stroke}
					/>
					<circle
						className={cn(
							"ft-ctxring-value",
							band === "ok" && "ft-status-pending",
							band === "warn" && "ft-status-running",
							band === "critical" && "ft-status-error"
						)}
						cx={centre}
						cy={centre}
						r={radius}
						fill="none"
						strokeWidth={stroke}
						strokeLinecap="round"
						strokeDasharray={circumference}
						strokeDashoffset={dashOffset}
						transform={`rotate(-90 ${centre} ${centre})`}
					/>
				</svg>
			</span>

			{showLabel && (
				<span className="ft-ctxring-label text-foreground/70 text-xs tabular-nums" aria-hidden="true">
					{labelText}
				</span>
			)}
		</>
	);

	return (
		<div
			ref={composedRootRef}
			className={cn("ft-ctxring inline-flex items-center gap-2", className)}
			data-band={band}
		>
			{expandable ? (
				/*
				 * An explicit `aria-label`, because a button flattens everything inside it
				 * to presentational: the `role="meter"` and its value below never reach
				 * assistive tech once they are nested here. The button's own name carries
				 * both the meter's name and its current reading instead.
				 */
				<button
					ref={triggerRef}
					type="button"
					className="ft-ctxring-trigger hover:bg-foreground/5 focus-visible:ring-ring -mx-1 -my-0.5 inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
					aria-expanded={open}
					aria-controls={panelId}
					aria-label={`${label}, ${valueText}`}
					onClick={toggle}
				>
					{face}
				</button>
			) : (
				face
			)}

			{expandable && open && (
				/*
				 * Rendered only while it is on screen: a breakdown that lives in the DOM
				 * permanently is a hidden list every screen-reader element list has to
				 * step over. The anchor is read through a getter so the float re-measures
				 * the trigger on every scroll and resize tick rather than holding a stale
				 * rect.
				 */
				<div
					ref={panelRef}
					id={panelId}
					role="group"
					aria-label={`${label} breakdown`}
					className="ft-ctxring-panel z-50 rounded-lg border p-2 text-left text-xs shadow-lg"
				>
					{rows.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{/*
								Keyed on the label *and* the index: a model happily reports two
								rows called "System prompt", and a key that is only the label
								would make the second one replace the first.
							*/}
							{rows.map((row, i) => (
								<li
									key={`${row.label}#${i}`}
									className="ft-ctxring-row flex items-baseline justify-between gap-4"
								>
									<span className="min-w-0 truncate">{row.label}</span>
									{/* Kept explicitly: the source markup leaves whitespace between
									    the two spans, and the row's spoken/copied text depends on it. */}{" "}
									<span className="ft-ctxring-row-value flex-none tabular-nums">
										{compact(row.tokens)}
									</span>
								</li>
							))}
						</ul>
					) : (
						<p className="ft-ctxring-empty italic">{NO_BREAKDOWN}</p>
					)}
				</div>
			)}
		</div>
	);
});
