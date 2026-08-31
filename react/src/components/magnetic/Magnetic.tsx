import { forwardRef, useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { observeInView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { rafThrottle } from "../../internals/motion/raf.js";
import "./magnetic.css";

/**
 * Props for Magnetic — a generic single-child wrapper that translates its
 * child toward the pointer while the pointer sits inside an activation
 * field larger than the child's own box, and springs back to rest once
 * the pointer leaves. The field is the child's bounding rect inflated by
 * `radius` on every side (not a circular distance-from-center test) so a
 * wide button and a small icon feel equally "magnetic" at their edges.
 *
 * There is deliberately no keyboard/focus equivalent: unlike Reveal
 * (which reveals on `focusin`), Magnetic never *reacts* to focus —
 * `focusin` triggers nothing, and Tab never starts, stops, or changes a
 * pull. That is not the same claim as "focus always finds it at rest":
 * if a fine pointer happens to be resting inside the field when focus
 * arrives, the child is already displaced by that pointer, and Tab lands
 * on it there — the resting position is the pointer's, not the layout's.
 * Pointer attraction is a fine-pointer affordance, not a state to
 * replicate for every input method. See `README.md` for the full
 * reasoning.
 */
export interface MagneticProps extends HTMLAttributes<HTMLDivElement> {
	/** Additional CSS classes, merged onto the static outer wrapper. */
	className?: string;
	/** Pull multiplier applied to the pointer's offset from the child's center. Higher = a more aggressive follow. */
	strength?: number;
	/** Pixels the activation field extends beyond the outer element's own box, on every side. Also sizes the (transparent by default) `::before` halo. */
	radius?: number;
	/** Per-axis clamp (px) on the translated offset — a hard travel cap independent of element geometry, `radius`, or `strength`. */
	max?: number;
	/** Disables the pull: no listeners are attached at all, and both translation vars are pinned at `0px`. Never touches the wrapped child's own `disabled` state. */
	disabled?: boolean;
	/** The single wrapped element — a button, icon link, or card. */
	children: ReactNode;
}

// Literal defaults, also the "has this prop actually been customized"
// baseline for the inline `--ft-magnetic-radius` var below (see the
// common contract's "per-component var written inline only when the
// prop is provided" rule) — an instance left at the default must not
// shadow a page-level `--ft-magnetic-radius` override with its own
// hardcoded copy of the same number.
const DEFAULT_STRENGTH = 0.35;
const DEFAULT_RADIUS = 40;
const DEFAULT_MAX = 24;

function clamp(value: number, bound: number): number {
	return Math.min(bound, Math.max(-bound, value));
}

export const Magnetic = forwardRef<HTMLDivElement, MagneticProps>(function Magnetic(
	{
		className,
		strength = DEFAULT_STRENGTH,
		radius = DEFAULT_RADIUS,
		max = DEFAULT_MAX,
		disabled = false,
		children,
		style,
		...restProps
	},
	forwardedRef
) {
	// The outer node is the stable reference frame every frame's
	// `getBoundingClientRect()` reads against; the inner node is the ONLY
	// node that ever receives `transform` — if the halo or the activation
	// math lived on a node that itself moved, the field would desync from
	// the pull and visually "chase" the pointer.
	const [outer, outerRefCallback] = useElementRef<HTMLDivElement>();
	const [inner, innerRefCallback] = useElementRef<HTMLDivElement>();
	const composedOuterRef = useComposedRefs(forwardedRef, outerRefCallback);

	const [magnetState, setMagnetState] = useState<"idle" | "active">("idle");
	// Tracks whether the field is actually holding a non-rest pull that a
	// future `release()` would need to zero out. Deliberately NOT the same
	// thing as `magnetState === "active"`: right after mount the state is
	// already "idle" but the vars have never been written at all (still the
	// empty string, not the literal "0px"), so the very first out-of-field
	// frame must still be allowed through once. Starts `true` for exactly
	// that reason; `release()` clears it, the active branch below re-arms it.
	const needsRelease = useRef(true);

	const reduced = useReducedMotion();
	// Read live by the frame handler so a mid-interaction prop change is
	// honored on the very next frame without rebuilding the listener stack —
	// the counterpart of the source component's live prop reads.
	const strengthRef = useLiveRef(strength);
	const maxRef = useLiveRef(max);

	// The entire pointer-tracking stack — IntersectionObserver, the window
	// `pointermove` listener, the document `pointerleave` safety net — exists
	// only while Magnetic is actually capable of moving anything. Disabled
	// and reduced-motion both gate at this single point (rather than being
	// threaded through each listener separately) so "no listeners attached"
	// is one branch to verify, not three, and so flipping either prop
	// mid-interaction tears everything down through the same cleanup path
	// an unmount would use.
	useEffect(() => {
		if (!outer || !inner) return;

		/**
		 * Zeroes the translation and flips back to idle. One function for every
		 * release path — pointer left the inflated rect, the pointer left the
		 * whole document, a listener teardown, `disabled`/reduced-motion turning
		 * on mid-interaction — so none of them can disagree about what
		 * "released" actually means. Vars are written as the literal `0px`
		 * (never removed), matching the CSS's own `0px` fallback exactly.
		 */
		function release() {
			setMagnetState("idle");
			inner?.style.setProperty("--ft-magnetic-x", "0px");
			inner?.style.setProperty("--ft-magnetic-y", "0px");
			needsRelease.current = false;
		}

		if (disabled || reduced) {
			release();
			return;
		}

		const handlePointerMove = rafThrottle((event: PointerEvent) => {
			// A touch pointer resting on the field (or a second/third simultaneous
			// touch point) is not "hovering near" anything — it is either about to
			// tap or already part of a multi-touch gesture neither of which this
			// affordance should react to.
			if (event.pointerType === "touch" || !event.isPrimary) return;

			// Re-measured every frame rather than cached at listener-attach time:
			// a layout shift under the pointer (reflow, a sibling resizing) must
			// never leave the field testing a stale rect.
			const rect = outer.getBoundingClientRect();
			const { clientX: px, clientY: py } = event;
			const inField =
				px >= rect.left - radius &&
				px <= rect.right + radius &&
				py >= rect.top - radius &&
				py <= rect.bottom + radius;

			if (!inField) {
				// Only pay for the write path (a forced `getBoundingClientRect()` is
				// already unavoidable above, but `release()` also does two CSSOM
				// `style.setProperty()` calls) when there is actually something to
				// release — otherwise every `pointermove` anywhere on the page, for
				// the entire time an instance is on screen, dirties this element's
				// style every frame for no reason.
				if (needsRelease.current) release();
				return;
			}

			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			const pullX = clamp((px - centerX) * strengthRef.current, maxRef.current);
			const pullY = clamp((py - centerY) * strengthRef.current, maxRef.current);

			setMagnetState("active");
			needsRelease.current = true;
			inner.style.setProperty("--ft-magnetic-x", `${pullX}px`);
			inner.style.setProperty("--ft-magnetic-y", `${pullY}px`);
		});

		let windowListenerAttached = false;

		function attach() {
			if (windowListenerAttached) return;
			windowListenerAttached = true;
			window.addEventListener("pointermove", handlePointerMove, { passive: true });
		}
		function detach() {
			if (!windowListenerAttached) return;
			windowListenerAttached = false;
			window.removeEventListener("pointermove", handlePointerMove);
			release();
		}

		// The framework-free core is called directly (not through `useInView`):
		// the observer must not exist AT ALL while disabled or reduced-motion
		// (this effect's own guard above), and the hook has no way to skip
		// construction without also giving up the attach/detach pairing below.
		//
		// `rootMargin` is inflated by `radius` (not left at the foundation's
		// own default) so a Magnetic instance sitting just outside the
		// viewport — but whose activation field already pokes into it — still
		// gets its window listener attached; a plain "is the raw box on
		// screen" test would otherwise miss that edge case entirely.
		const ioHandle = observeInView(outer, {
			once: false,
			threshold: 0,
			rootMargin: `${radius}px`,
			onChange: (intersecting) => {
				if (intersecting) attach();
				else detach();
			},
		});

		// A pointer dragged off to OS chrome or another window never fires
		// another `pointermove` inside this page — without this, the last
		// computed pull would freeze on screen instead of releasing.
		// `pointerleave` (not `mouseleave`) is the event that actually fires
		// when the pointer leaves the whole document, not just one element.
		document.addEventListener("pointerleave", release, { passive: true });

		// `pointerleave` alone misses a keyboard tab switch (Cmd/Alt+Tab,
		// Ctrl+Tab): no pointer crosses any boundary, so nothing above fires,
		// and the pull would otherwise freeze mid-travel until the pointer
		// moves again on return. `window`'s `blur` fires whenever the page
		// loses focus for any reason — including, but not limited to, a tab
		// switch — so it releases that case too.
		window.addEventListener("blur", release, { passive: true });

		return () => {
			ioHandle.destroy();
			detach();
			document.removeEventListener("pointerleave", release);
			window.removeEventListener("blur", release);
			handlePointerMove.cancel();
		};
		// `strength`/`max` are read live through refs on every frame and must
		// not tear the listener stack down; `radius` changes the observer's
		// own rootMargin, so it rebuilds — matching the source's reactivity.
	}, [outer, inner, disabled, reduced, radius, strengthRef, maxRef]);

	const mergedStyle =
		radius === DEFAULT_RADIUS
			? style
			: ({ ...style, "--ft-magnetic-radius": `${radius}px` } as CSSProperties);

	return (
		<div
			ref={composedOuterRef}
			className={cn("ft-magnetic", className)}
			{...restProps}
			style={mergedStyle}
			data-state={magnetState}
			data-disabled={disabled ? "true" : undefined}
		>
			<div ref={innerRefCallback} className="ft-magnetic-inner">
				{children}
			</div>
		</div>
	);
});
