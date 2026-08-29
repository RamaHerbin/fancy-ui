import { forwardRef, useContext, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { TABS_KEY } from "./types.js";
import "./tabs-list.css";

export interface TabsListProps {
	/** The `TabsTrigger`s. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/** Backstop that drops `will-change` again after a tween.
 *
 * `will-change: transform` is a promise to the compositor, not a style;
 * leaving it on permanently costs a permanent layer for a bar that moves a few
 * times a session. `transitionend` is the honest signal to drop it, but jsdom
 * never fires one, so the release is keyed to the same token the CSS
 * transition below uses plus a slack margin — deterministic in both. */
const WILL_CHANGE_RELEASE = DURATIONS.fast + 50;

/**
 * The rail of triggers, plus the single sliding indicator that paints the
 * selection.
 *
 * The element arrives through the ref channel rather than a `ref` prop, per
 * PORTING.md — the Svelte source declares `ref = $bindable(null)`. Rest props
 * are not spread, for the same reason as on the root.
 */
export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
	({ children, className }, forwardedRef) => {
		// Undefined outside a Tabs root: orientation/variant then fall back to
		// this component's own defaults rather than throwing, matching every
		// other compound in this library.
		const context = useContext(TABS_KEY);
		const orientation = context?.orientation ?? "horizontal";
		const variant = context?.variant ?? "underline";

		const classes = cn(
			"ft-tabs-list inline-flex",
			orientation === "vertical" ? "flex-col" : "flex-row",
			variant === "underline"
				? cn("border-border", orientation === "vertical" ? "border-r" : "border-b")
				: "ft-tabs-list-segmented bg-background border-border w-fit border",
			className
		);

		/*
		 * ---------------------------------------------------------------------
		 * The sliding indicator
		 * ---------------------------------------------------------------------
		 *
		 * A single `aria-hidden` box, absolutely positioned at the list's own
		 * origin and moved with `transform` alone — never `left`/`width`, which
		 * would relayout the whole rail on every keystroke of an arrow-key walk.
		 * It is a 1×1 box that `translate()` puts at the selected trigger and
		 * `scale()` stretches to its size, so one transform carries both the
		 * position and the length.
		 *
		 * It is a progressive enhancement, never the only selection signal: the
		 * selected trigger keeps `aria-selected="true"` and its own foreground
		 * colour, so a screen reader, a forced-colors user and a JS-off render
		 * all still see which tab is active.
		 */

		// Plain refs, not `useElementRef`: both nodes are rendered
		// unconditionally, so they are attached by the time any effect below
		// runs — convention C-1's hazard is a node whose very existence is
		// conditional, which neither of these is.
		const listRef = useRef<HTMLDivElement | null>(null);
		const setListRef = useComposedRefs(forwardedRef, listRef);
		const indicatorRef = useRef<HTMLDivElement | null>(null);

		const willChangeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

		// Snapshots of the inputs the last placement ran with. Refs, not state —
		// only the placement effect reads or writes them, and nothing needs to
		// re-render when they change. They are what lets one effect tell three
		// cases apart: a selection moving (tween), a geometry change (snap,
		// because tweening between two different geometries is meaningless), and
		// the very first paint (snap, because the bar must not fly in from
		// `translate(0) scale(0)`).
		const placedOnceRef = useRef(false);
		const lastValueRef = useRef<string | undefined>(undefined);
		const lastOrientationRef = useRef<"horizontal" | "vertical" | undefined>(undefined);
		const lastVariantRef = useRef<"underline" | "segmented" | undefined>(undefined);

		function activeTrigger(): HTMLElement | null {
			return (
				listRef.current?.querySelector<HTMLElement>(
					'[data-ft-tabs-trigger][aria-selected="true"]'
				) ?? null
			);
		}

		function releaseWillChange(): void {
			clearTimeout(willChangeTimerRef.current);
			willChangeTimerRef.current = undefined;
			const el = indicatorRef.current;
			if (el) el.style.willChange = "";
		}

		/**
		 * Writes the indicator's transform. `animate: false` snaps: first paint,
		 * a resize, an orientation/variant change, and every write made while the
		 * user asks for reduced motion — the bar still tracks the selection then,
		 * it just arrives without a tween.
		 *
		 * Wrapped in `useEventCallback` so the long-lived observer callbacks
		 * below always call the latest render's version — the React counterpart
		 * of a Svelte function closing over live reactive state.
		 */
		const place = useEventCallback((animate: boolean): void => {
			const el = indicatorRef.current;
			if (!el) return;

			const active = activeTrigger();
			if (!active) {
				// Nothing is selected — `value` was never set, or points at a
				// value no trigger claims. The bar is not "at zero", it is absent.
				el.style.opacity = "0";
				return;
			}

			const vertical = orientation === "vertical";
			const off = vertical ? active.offsetTop : active.offsetLeft;
			const size = vertical ? active.offsetHeight : active.offsetWidth;

			// A zero-size measurement is jsdom, a `display: none` ancestor, or a
			// first paint the browser has not laid out yet — never a real state.
			// Stay hidden rather than collapsing to a 0-wide sliver at the origin.
			if (size === 0) {
				el.style.opacity = "0";
				return;
			}
			el.style.opacity = "1";

			// The segmented pill is the trigger's whole box, so it stretches on
			// both axes; the underline bar is a 2px rule that only ever grows
			// along the rail's own axis.
			const transform =
				variant === "segmented"
					? `translate(${active.offsetLeft}px, ${active.offsetTop}px) scale(${active.offsetWidth}, ${active.offsetHeight})`
					: vertical
						? `translateY(${off}px) scaleY(${size})`
						: `translateX(${off}px) scaleX(${size})`;

			if (variant === "segmented") {
				// Feeds the `calc()` in the CSS that pre-divides the pill's radius
				// by its own scale factors, so the rendered corner keeps the
				// theme's own radius instead of being stretched into an ellipse.
				// Written by JS, and therefore internal — not a knob a consumer
				// should set.
				el.style.setProperty("--ft-tabs-indicator-sx", String(active.offsetWidth));
				el.style.setProperty("--ft-tabs-indicator-sy", String(active.offsetHeight));
			}

			// The selection did not move — this is a focus walk (the effect below
			// reads `focusedValue`), or a resize that changed nothing. Rewriting a
			// byte-identical transform would force a layout for nothing, and — on
			// the `animate: false` path, which suspends the transition — would
			// cancel a slide that is still in flight and teleport the bar to its
			// destination.
			if (el.style.transform === transform) return;

			// Nothing to tween FROM: the bar has never been successfully placed
			// (nothing was selected at mount, or the last measurement was zero, so
			// the branches above returned before writing anything). A transition
			// from the identity matrix would fly a 1x1 box in from the list's own
			// origin — the same artifact the first-paint snap exists to prevent.
			if (animate && !el.style.transform) animate = false;

			if (animate) {
				el.style.willChange = "transform";
				el.style.transform = transform;
				clearTimeout(willChangeTimerRef.current);
				willChangeTimerRef.current = setTimeout(releaseWillChange, WILL_CHANGE_RELEASE);
				return;
			}

			// Suspend → write → force a reflow → restore. Without the forced read
			// between suspending and restoring, the browser coalesces all three
			// writes into one style recalculation and the "snap" tweens anyway.
			// Restoring the *previous* value rather than clearing it is what keeps
			// a consumer's own inline `transition` (or a later tween) alive.
			releaseWillChange();
			const previous = el.style.transition;
			el.style.transition = "none";
			el.style.transform = transform;
			void el.offsetWidth;
			el.style.transition = previous;
		});

		// Everything that outlives a single render lives here, and this effect
		// depends on nothing that changes — deliberately NOT on the selection.
		//
		// DEVIATION from the contract's "one effect owns all of it": a
		// `ResizeObserver` delivers a callback as soon as `observe()` runs, so
		// folding the observer into the placement effect below would tear it down
		// and re-establish it on every tab change, and that first callback would
		// land right after the tween's write and snap it. Keeping it in its own
		// mount-scoped effect keeps the observer alive across selections; the
		// cleanup still does both jobs the contract asks of it, on unmount.
		useIsomorphicLayoutEffect(() => {
			const list = listRef.current;
			if (!list) return;

			// The list's own box changing means every trigger's offset may have
			// moved: a wrap, a font swap, a sibling arriving. R8: a resize snaps,
			// it never tweens — the bar was never "travelling" to its new place.
			const observer = new ResizeObserver(() => place(false));
			observer.observe(list);

			// The list's border box is not enough on its own. Inside a fixed-width
			// `TabsList` a trigger can change its own label — and therefore its
			// width and every later trigger's offset — while the list measures the
			// same to the pixel. Observing the triggers as well is what catches it.
			function observeTriggers(el: HTMLElement): void {
				for (const trigger of el.querySelectorAll<HTMLElement>("[data-ft-tabs-trigger]")) {
					// `ResizeObserver.observe` on an element already observed is a
					// no-op, so re-running this on every mutation costs nothing and
					// saves tracking which triggers are new.
					observer.observe(trigger);
				}
			}
			observeTriggers(list);

			// And geometry can move with NO box changing size at all: reordering
			// equal-width keyed tabs swaps two offsets while every observed border
			// box stays identical, so no resize ever fires. The mutation is the
			// only signal there is — it also picks up triggers that arrive later,
			// which is why `observeTriggers` runs again from here.
			const mutations = new MutationObserver(() => {
				observeTriggers(list);
				place(false);
			});
			mutations.observe(list, { childList: true, subtree: true, characterData: true });

			return () => {
				observer.disconnect();
				mutations.disconnect();
				releaseWillChange();
			};
			// `place` is identity-stable for the life of the component; nothing
			// else here is read from a render scope.
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [place]);

		const value = context?.value ?? "";
		// Read, not used: `focusedValue` recomputes from the roving-focus
		// registry, so a trigger mounting or unmounting re-runs this effect and
		// re-places the bar. The list's own `ResizeObserver` catches the same
		// thing in a browser, but only once layout has settled — this gets there
		// in the same commit.
		const focusedValue = context?.focusedValue ?? null;

		useIsomorphicLayoutEffect(() => {
			const first = !placedOnceRef.current;
			const geometryChanged =
				orientation !== lastOrientationRef.current || variant !== lastVariantRef.current;
			const selectionMoved = value !== lastValueRef.current;

			placedOnceRef.current = true;
			lastValueRef.current = value;
			lastOrientationRef.current = orientation;
			lastVariantRef.current = variant;

			// The tween is the one case where all three conditions hold. Reduced
			// motion is read here, at the instant of the write, rather than kept
			// as reactive state: a preference that flips mid-flight should not
			// retro-cancel a bar already on its way.
			place(selectionMoved && !first && !geometryChanged && !prefersReducedMotion());
		}, [value, focusedValue, orientation, variant, place]);

		return (
			/*
			 * role="tablist" needs no accessible name of its own per the WAI-ARIA
			 * Tabs pattern unless a page has more than one — a consumer with
			 * several tab groups on screen at once can still add one through
			 * `className` plus their own `aria-label` via a wrapping element, or by
			 * giving each Tabs root a distinct heading before it.
			 */
			<div
				ref={setListRef}
				role="tablist"
				aria-orientation={orientation === "vertical" ? "vertical" : undefined}
				data-orientation={orientation}
				data-variant={variant}
				className={classes}
			>
				{children}
				{/*
				 * Last child so it paints under the triggers in the segmented
				 * variant without needing a stacking context on the list itself.
				 * `aria-hidden` plus no role and no tabindex: it is never announced,
				 * never focusable, and `pointer-events: none` keeps it out of the
				 * hit-test entirely.
				 */}
				<div
					ref={indicatorRef}
					className="ft-tabs-indicator"
					aria-hidden="true"
					data-variant={variant}
					data-orientation={orientation}
				/>
			</div>
		);
	}
);

TabsList.displayName = "TabsList";
