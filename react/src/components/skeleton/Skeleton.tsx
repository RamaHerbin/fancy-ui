import { forwardRef, useEffect, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS, JS_EASINGS } from "../../internals/motion/tokens.js";
import { usePresence } from "../../internals/motion/presence.js";
import "./skeleton.css";

/**
 * Props for Skeleton.
 */
export interface SkeletonProps
	extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className"> {
	/** Bone shape: a block, one or more text lines, or a circular avatar */
	variant?: "rect" | "text" | "circle";
	/** Number of text lines to render; only read when `variant="text"`. The
	 * last line renders at 60% width so a paragraph placeholder doesn't read
	 * as a perfect rectangle. */
	lines?: number;
	/** Shimmer sweep, opacity pulse, or a static muted bone (still a valid
	 * loading cue on its own). */
	animation?: "shimmer" | "pulse" | "none";
	/** Whether the placeholder is currently showing. In wrapping mode
	 * (`children` supplied) this drives the swap to real content; in
	 * standalone mode it drives whether anything renders at all. */
	loading?: boolean;
	/** The one screen-reader announcement. Pass `""` to silence it entirely. */
	label?: string;
	/** Real content to reveal once `loading` is false. Its mere presence (not
	 * its value) is what switches Skeleton from standalone to wrapping mode —
	 * see the README for the two ARIA shapes that follow from that. */
	children?: ReactNode;
	/** Additional CSS classes. Also the usual sizing hook: `rect`/`text` bones
	 * have no intrinsic size, so a caller sizes them with `className="h-4 w-40"`
	 * or similar. */
	className?: string;
}

// Opacity only, `DURATIONS.exit` (200ms) on `JS_EASINGS.in` — a departure
// curve for a departing layer (params below).
const bonesFade = preset("fade");

/**
 * The forwarded ref is `null` whenever nothing is rendered (standalone mode
 * with `loading=false`), matching the rest of the library's "ref is null
 * while there's no root to bind" convention (see Presence).
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
	{
		variant = "rect",
		lines = 1,
		animation = "shimmer",
		loading = true,
		label = "Loading",
		children,
		className,
		style,
		...restProps
	},
	forwardedRef
) {
	// Presence of `children` — not its current value — is what decides the
	// mode. A caller that always passes `children` (even while it renders
	// nothing meaningful yet) is asking for wrapping mode's ARIA shape, which
	// is the point: the two shapes differ in what happens once `loading` goes
	// false, and only wrapping mode has something to swap to.
	const wrapping = children !== undefined;

	// `Math.floor` alone would let a non-finite `lines` (NaN, ±Infinity) leak
	// through `Math.max` unclamped (`Math.max(1, NaN)` is `NaN`, and
	// `Array.from({ length: NaN })` is `[]` — a caller-supplied bad value would
	// silently render zero bones). `Number.isFinite` catches that before the
	// clamp instead.
	let lineCount = 1;
	if (variant === "text") {
		const n = Math.floor(lines);
		lineCount = Number.isFinite(n) ? Math.max(1, n) : 1;
	}
	const bones = Array.from({ length: lineCount }, (_, i) => i);

	// The reveal. Bones do not cut to content, they fade out ON TOP of it:
	// the content lands in its final, unwrapped position on the first frame
	// and never moves, while the outgoing bones become an out-of-flow overlay
	// the content sizes for them. That answers "what sizes the slot while both
	// layers are mounted" with "the content does", and it is why there is no
	// layer wrapper here — the root IS the eventual content container (see the
	// comment on the wrapping branch below), so introducing one, even only for
	// the length of the fade, would move the caller's children in the tree
	// and make React destroy and recreate them: focus, scroll position and
	// media playback lost, in exchange for a cross-fade nobody asked for.
	//
	// `bonesLingering` deliberately LAGS `loading` by one update. The instant
	// `loading` flips false the content branch renders while this is still
	// true, so the overlay mounts already sitting over the real content; the
	// effect then writes it false, and THAT is what starts the fade.
	//
	// Seeded `false`, never `true`: a Skeleton that mounts with
	// `loading={false}` has nothing to reveal and must not flash a set of
	// bones over content that was never hidden. Mounting the other way round
	// costs nothing — while `loading` is true the bones are in flow and the
	// overlay is not rendered at all, and the effect below has already armed
	// this by the time the first reveal can happen.
	const [bonesLingering, setBonesLingering] = useState(false);
	useEffect(() => {
		setBonesLingering(loading);
	}, [loading]);

	// The overlay's mount clock. The Svelte source expresses the fade as an
	// exit-only transition on a closing block; here `usePresence` owns the
	// same window: the overlay opens the instant `loading` flips false (while
	// `bonesLingering` still lags true), and the lag effect's write is what
	// starts the exit. The ENTER leg runs at duration 0 — an exit-only
	// transition has no intro, so the overlay must appear already at rest,
	// full opacity, exactly as a freshly mounted block does. The exit reads
	// `prefersReducedMotion()` inside the params factory, which `usePresence`
	// calls at the instant the leg starts: the preference is read then, never
	// at construction and never during SSR. `duration: 0` finishes the leg
	// synchronously without ever touching `element.animate()`, so the overlay
	// is gone in the same flush it mounted — exactly the instant swap this
	// component had before the reveal existed.
	const overlayOpen = !loading && bonesLingering;
	const overlayPresence = usePresence(overlayOpen);
	const overlayRef = overlayPresence.register(bonesFade, (entering) =>
		entering
			? { duration: 0 }
			: {
					duration: prefersReducedMotion() ? 0 : DURATIONS.exit,
					easing: JS_EASINGS.in,
				}
	);

	// Page-wide shimmer phase sync. Every Skeleton instance on the page reads
	// the SAME shared monotonic timeline, so instances that mount at different
	// wall-clock moments (e.g. a list revealing rows progressively) still
	// converge on one shimmer phase instead of each starting its own visibly
	// drifting 1.6s loop. `document.timeline` is a Level-2 Web Animations API
	// surface — not universal (Safari support lagged historically) and absent
	// in jsdom — so this degrades to "every instance loops unsynced from 0%,
	// still animates correctly" whenever it's unavailable. Never a hard
	// requirement, just a nicety where supported.
	//
	// Seeded `null` and written from an effect, never read during render:
	// nothing may differ between a server render and its hydration (C-7).
	const [phaseValue, setPhaseValue] = useState<string | null>(null);
	useEffect(() => {
		if (typeof document === "undefined" || typeof document.timeline?.currentTime !== "number") {
			setPhaseValue(null);
			return;
		}
		// Mirrors the CSS literal fallback for --ft-skeleton-duration (1.6s).
		// Nothing enforces the two stay equal; update both by hand if the CSS
		// default ever changes.
		const durationMs = 1600;
		const phase = -(Number(document.timeline.currentTime) % durationMs);
		setPhaseValue(`${phase}ms`);
	}, []);

	// Merged INTO the caller's own `style` rather than rendered as a separate
	// attribute, so a caller-supplied `style` and the internal phase custom
	// property coexist — the same reason the Svelte source writes the phase
	// through a `style:` directive rather than a raw attribute.
	const mergedStyle =
		phaseValue === null
			? style
			: ({ ...style, "--ft-skeleton-phase": phaseValue } as CSSProperties);

	function boneClass(index: number): string {
		return cn(
			"ft-skeleton-bone",
			index === lineCount - 1 && lineCount > 1 && "ft-skeleton-bone--short"
		);
	}

	const bonesList = bones.map((i) => (
		<div key={i} className={boneClass(i)} aria-hidden="true"></div>
	));

	if (wrapping) {
		// Wrapping mode: the root IS the eventual content container, so it never
		// carries role="status" itself — once loading flips false the real content
		// takes over this exact node, and a live region that outlives its own
		// announcement would be wrong. aria-busy mirrors Button's own semantics
		// (a machine-readable "still working" flag, independent of any visual
		// dimming).
		//
		// The sr-only status span outlives the bones on purpose: a live region
		// that is INSERTED already populated is announced unreliably (assistive
		// tech registers the region first, then reports changes to it), and
		// `loading` false → true is a normal reuse flow here — a refetch on an
		// already-rendered wrapper. So the region is mounted for as long as the
		// component is, and only its TEXT changes; emptied rather than removed
		// once `children` takes over, so nothing lingers to re-announce.
		return (
			<div
				ref={forwardedRef}
				className={cn("ft-skeleton", className)}
				{...restProps}
				style={mergedStyle}
				aria-busy={loading ? "true" : undefined}
				data-variant={variant}
				data-animation={animation}
				data-loading={loading ? "true" : undefined}
			>
				{loading ? (
					bonesList
				) : (
					<>
						{/*
							The bones on their way out, `aria-hidden` and out of flow. They
							are NOT the live region: `role="status"` lives and dies with
							the in-flow bones above, so the announcement never outlives
							itself by lingering into the fade. `pointer-events: none` (see
							the stylesheet) is what makes the revealed content clickable
							from frame one despite something still being painted over it.
						*/}
						{overlayPresence.mounted && (
							<div ref={overlayRef} className="ft-skeleton-bones-out" aria-hidden="true">
								{bonesList}
							</div>
						)}
						{children}
					</>
				)}
				{label !== "" && (
					<span role="status" aria-live="polite" className="sr-only">
						{loading ? label : ""}
					</span>
				)}
			</div>
		);
	}

	if (!loading) {
		// Standalone mode with nothing to swap to: renders nothing at all
		// rather than leaving inert, unannounced bones sitting in the DOM,
		// and the forwarded ref is null while there's no root to bind.
		return null;
	}

	// Standalone mode: Skeleton IS the loading indicator (a list seeded with
	// placeholder rows before data arrives), so the root itself announces —
	// copying PixelLoader/TypingIndicator's own role="status" placement
	// exactly. There is no `children` to swap to here, so `loading=false` with
	// nothing supplied renders nothing at all (above).
	//
	// That is also why standalone mode cannot keep its live region mounted the
	// way wrapping mode does: with nothing rendered at all there is no node
	// left to host one, and the "renders nothing / ref is null" contract
	// (shared with Presence) outranks it. A caller who toggles `loading` back
	// and forth on a persistent node wants wrapping mode.
	return (
		<div
			ref={forwardedRef}
			className={cn("ft-skeleton", className)}
			{...restProps}
			style={mergedStyle}
			role="status"
			aria-live="polite"
			data-variant={variant}
			data-animation={animation}
			data-loading={loading ? "true" : undefined}
		>
			{bonesList}
			{label !== "" && <span className="sr-only">{label}</span>}
		</div>
	);
});
