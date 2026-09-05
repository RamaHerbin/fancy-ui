import { forwardRef, useContext, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { runTransition } from "../../internals/motion/animate.js";
import type { TransitionRun } from "../../internals/motion/animate.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { TABS_KEY } from "./types.js";

export interface TabsContentProps {
	/** Which `TabsTrigger` shows this panel. */
	value: string;
	/**
	 * Keeps this panel mounted in the DOM (with the `hidden` attribute)
	 * even while inactive, instead of the default of unmounting it
	 * entirely. Needed for content — an iframe, a video, a form with
	 * uncommitted input — that must not remount every time the user tabs
	 * away and back.
	 */
	forceMount?: boolean;
	/** The panel's content. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

// An ENTRANCE, never a cross-fade, and an enter-only leg rather than a
// two-way transition.
//
// TabsContent instances are siblings the caller places by hand: there is no
// shared container to stack an outgoing panel inside, and each panel owns its
// own conditional below. A true cross-fade would need the outgoing panel taken
// out of flow inside a containing block this component does not own and cannot
// create without wrapping every caller's content in a layer element — a
// permanent structural change to every panel in the library, for one 150ms
// dissolve. So the panel being left cuts away exactly as it always did, and
// only the arriving one is animated: the hard cut is the defect that was
// actually visible.
//
// Because the entrance never delays an unmount, nothing that observes the swap
// changes — the previous panel is out of the DOM in the same commit the new one
// lands, and no assertion in the suite had to be rewritten for this.
//
// Module scope, not per instance: `preset()` is a pure factory returning a
// pure function, so one instance serves every panel.
const panelFade = preset("fade");

/**
 * One tab's panel. Rendered only while its trigger is selected, unless
 * `forceMount` keeps it in the DOM behind the `hidden` attribute.
 *
 * The element arrives through the ref channel rather than a `ref` prop, per
 * PORTING.md — the Svelte source declares `ref = $bindable(null)`. Rest props
 * are not spread, for the same reason as on the root.
 */
export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
	({ value, forceMount = false, children, className }, forwardedRef) => {
		// Undefined outside a Tabs root: nothing is ever "selected", so this
		// panel only renders when `forceMount` is set, matching the graceful
		// degradation every other compound piece in this library falls back to.
		const context = useContext(TABS_KEY);
		const isSelected = context?.isSelected(value) ?? false;
		const rendered = isSelected || forceMount;

		const innerRef = useRef<HTMLDivElement | null>(null);
		const setRef = useComposedRefs(forwardedRef, innerRef);

		// The entrance plays on a real selection change only, not on first
		// render: Svelte's local `in:` runs only once the block that owns it has
		// already run, so a panel that starts selected simply appears. The React
		// counterpart is the false→true EDGE of `rendered`, seeded from the very
		// first render — never a one-shot "have I run yet" latch, which
		// StrictMode's mount → cleanup → mount rehearsal would consume on the
		// first invocation and leave the second one animating a panel that
		// started selected. Tracking the edge instead makes every repeated setup
		// on the same `rendered` value a no-op, which is what a dev-only
		// rehearsal has to be. With `forceMount` every panel is mounted
		// permanently and the entrance never plays at all after that first
		// render — correct, since `forceMount` exists precisely to keep panels
		// alive and there is no way to animate a `hidden` attribute flip.
		const prevRenderedRef = useRef(rendered);

		// A layout effect, per the effect-phase policy: Svelte starts intros
		// pre-paint, and a passive effect would paint one frame at rest first.
		//
		// `prefersReducedMotion()` is called here, at the instant the leg starts,
		// rather than kept as state: the preference is read then, never at
		// construction and never during SSR. `duration: 0` makes `runTransition`
		// finish synchronously and never touch `element.animate()`.
		useIsomorphicLayoutEffect(() => {
			const wasRendered = prevRenderedRef.current;
			prevRenderedRef.current = rendered;
			if (wasRendered || !rendered) return;
			const el = innerRef.current;
			if (!el) return;
			let run: TransitionRun | undefined;
			run = runTransition(
				el,
				panelFade(el, { duration: prefersReducedMotion() ? 0 : DURATIONS.fast }, {
					direction: "in",
				}),
				1,
				undefined,
				() => {
					// On enter finish, abort: that drops the `fill: forwards` so
					// the panel falls back to its resting style instead of
					// carrying a finished animation — whose output outranks
					// author CSS — for the rest of its life.
					run?.abort();
					run = undefined;
				}
			);
			// And a leg still in flight when the panel leaves is cancelled
			// rather than left running against a detached node.
			return () => {
				run?.abort();
				run = undefined;
			};
		}, [rendered]);

		if (!rendered) return null;

		return (
			<div
				ref={setRef}
				id={context?.panelId(value)}
				role="tabpanel"
				aria-labelledby={context?.triggerId(value)}
				tabIndex={0}
				hidden={!isSelected}
				className={cn("ft-tabs-content", className)}
			>
				{children}
			</div>
		);
	}
);

TabsContent.displayName = "TabsContent";
