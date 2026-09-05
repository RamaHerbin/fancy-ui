import { forwardRef, useEffect, useState } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "../../utils.js";
import { rafThrottle } from "../../internals/motion/raf.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import "./scroll-progress.css";

/**
 * Props for ScrollProgress
 */
export interface ScrollProgressProps extends HTMLAttributes<HTMLDivElement> {
	/**
	 * An element to track instead of the document's own scroll. Setting
	 * this always forces JS mode (see the README's Motion section) — a
	 * CSS `scroll-timeline` can only reach an ancestor scroller, and an
	 * arbitrary `target` is not guaranteed to be one, so tracking it always
	 * costs a real scroll listener.
	 */
	target?: HTMLElement | null;
	/**
	 * `"top"` / `"bottom"` pin the bar to the matching viewport edge
	 * (`position: fixed` — the reading-progress convention, and a
	 * deliberate exception to the "a library component never leaves
	 * normal flow" rule). `"inline"` renders it in normal flow instead, so
	 * the caller places it — e.g. directly above the `target` it tracks.
	 */
	position?: "top" | "bottom" | "inline";
	/**
	 * Announces the bar as `role="progressbar"` with this accessible
	 * name. Omitted (the default), the bar is `aria-hidden="true"` —
	 * decorative chrome, the same choice most reading-progress bars make.
	 * Setting this also forces JS mode, same as `target`: a CSS-only bar
	 * has no live number to hand `aria-valuenow`.
	 */
	label?: string;
	/** Additional CSS classes */
	className?: string;
}

function clamp01(value: number): number {
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
}

/**
 * `scroller === window` reads the DOCUMENT's own scroll (the default,
 * no-`target` case); any other value is an element the caller wants
 * tracked instead. Only ever called from the JS-mode effect below — which
 * never runs during SSR — so the globals are safe to name even though
 * this module has no top-level `typeof window` guard.
 */
function readProgress(scroller: Window | HTMLElement): number {
	let scrollTop: number;
	let scrollHeight: number;
	let clientHeight: number;
	if (scroller instanceof HTMLElement) {
		({ scrollTop, scrollHeight, clientHeight } = scroller);
	} else {
		scrollTop = window.scrollY;
		scrollHeight = document.documentElement.scrollHeight;
		clientHeight = document.documentElement.clientHeight;
	}
	const max = scrollHeight - clientHeight;
	// Nothing to scroll (content fits, or hasn't laid out yet under
	// jsdom) reads as 0, not NaN/Infinity from a division by zero — an
	// empty reading-progress bar is the honest answer for "no distance to
	// travel", not an undefined one.
	return max > 0 ? clamp01(scrollTop / max) : 0;
}

/**
 * A thin bar that fills as the reader scrolls — the whole document by
 * default, or a specific element via `target`. On a browser that supports
 * CSS scroll-driven animations it needs no JavaScript at all; everywhere
 * else it falls back to a throttled scroll listener.
 */
export const ScrollProgress = forwardRef<HTMLDivElement, ScrollProgressProps>(
	function ScrollProgress(
		{ target = null, position = "top", label, className, ...restProps },
		forwardedRef
	) {
		// The JS-mode effect needs the live node (convention C-1), and the
		// consumer's ref rides along composed with it (C-2, C-4).
		const [node, nodeRef] = useElementRef<HTMLDivElement>();
		const composedRef = useComposedRefs(forwardedRef, nodeRef);

		/**
		 * `CSS.supports("animation-timeline", "scroll()")` is a fact about the
		 * environment — probed exactly ONCE, in a mount effect, and never
		 * again. Browser support for a CSS feature doesn't change mid-session,
		 * so re-probing on every render would just be wasted work.
		 *
		 * `undefined` (not yet probed) is also the SSR value and the value for
		 * every render before the mount effect runs — `data-mode` is therefore
		 * absent from the server-rendered HTML and only ever gets ADDED
		 * client-side, never changed out from under something the server
		 * already committed to. That is what keeps this hydration-safe: an
		 * attribute that doesn't exist yet on the server can't mismatch one
		 * added later.
		 */
		const [supportsScrollTimeline, setSupportsScrollTimeline] = useState<boolean | undefined>(
			undefined
		);

		/**
		 * `mode` is derived per render, NOT latched at the same moment as the
		 * capability probe above — it is recomputed from
		 * `supportsScrollTimeline` together with the live `target`/`label`
		 * props. That distinction matters because a `target` (or `label`) can
		 * arrive AFTER mount: a callback-ref element resolved on a later
		 * render, a conditionally rendered scroller, async content, or a route
		 * change can hand this component a target after the fact. Deriving
		 * `mode` means a bar that starts in CSS mode still flips to JS mode
		 * the instant such a `target`/`label` shows up, instead of staying
		 * latched onto the document's scroll forever. See the README's
		 * Implementation notes.
		 */
		const mode: "css" | "js" | undefined =
			supportsScrollTimeline === undefined
				? undefined
				: !target && label === undefined && supportsScrollTimeline
					? "css"
					: "js";

		/**
		 * Only meaningful once `label` is set — otherwise `aria-valuenow` is
		 * never rendered at all (see the JSX) and this is harmless, unread
		 * state. Routed through state rather than written straight to the DOM:
		 * unlike the per-frame `--ft-scrollprogress-value` write below, this
		 * only changes once per throttled tick and rounds to a whole percent,
		 * so the "bypass reactivity in a hot loop" doctrine doesn't apply —
		 * there is no hot loop here, just an occasional integer.
		 */
		const [valueNow, setValueNow] = useState(0);

		useEffect(() => {
			setSupportsScrollTimeline(
				typeof CSS !== "undefined" &&
					typeof CSS.supports === "function" &&
					CSS.supports("animation-timeline", "scroll()")
			);
		}, []);

		// Only JS mode ever attaches anything. CSS mode's entire reason to
		// exist is tracking scroll with ZERO JS — including before this effect
		// has had a chance to run at all, via the `@supports`-gated keyframe
		// animation in the colocated stylesheet.
		useEffect(() => {
			if (mode !== "js") return;
			if (!node) return;
			const scroller: Window | HTMLElement = target ?? window;
			const eventTarget = scroller as EventTarget;

			const update = () => {
				const progress = readProgress(scroller);
				// Bypasses React state on purpose, per the family's rAF-loop
				// doctrine: this can run up to once per animation frame, and
				// routing it through state → re-render would be the exact
				// anti-pattern the doctrine warns about for a per-frame write.
				// Set on the ROOT (not the bar) — CSS custom properties
				// inherit, so the bar picks the value up through
				// `.ft-scrollprogress-bar`'s own
				// `scaleX(var(--ft-scrollprogress-value, 0))` without a second
				// write.
				node.style.setProperty("--ft-scrollprogress-value", String(progress));
				if (label !== undefined) setValueNow(Math.round(progress * 100));
			};

			const throttled = rafThrottle(update);
			const onScrollOrResize = () => throttled();

			update(); // paints the CURRENT position immediately, not just on the next scroll/resize
			eventTarget.addEventListener("scroll", onScrollOrResize, { passive: true });

			// `resize` is a WINDOW event: an element never fires one, so on the
			// `target` path that listener only ever looked like it was doing
			// something. What changes an element scroller's progress without a
			// scroll is its content growing — a streamed answer, a lazily loaded
			// page, an image finishing its download — and each of those leaves the
			// bar reporting the fraction it had while the content was shorter.
			//
			// Divergence from the Svelte source, which registers the same
			// never-firing `resize` listener on its target; observing is the only
			// way to get the event the listener was reaching for.
			let observer: ResizeObserver | null = null;
			let mutations: MutationObserver | null = null;

			if (!target) {
				eventTarget.addEventListener("resize", onScrollOrResize, { passive: true });
			} else {
				const scrollerEl = target;

				if (typeof ResizeObserver !== "undefined") {
					// The scroller's own box says how much fits; its children's boxes
					// say how much there is. Both move the fraction.
					observer = new ResizeObserver(onScrollOrResize);
					observer.observe(scrollerEl);
					// One full pass at connect time; after that the rows are
					// tracked through the mutation records instead. `observe` is
					// itself a scan of the observation list, so re-walking the
					// whole child list on every batch would make a streamed
					// transcript pay a cost quadratic in its length for each
					// appended chunk.
					for (const child of Array.from(scrollerEl.children)) observer.observe(child);

					const observeRows = (records: MutationRecord[]) => {
						for (const record of records) {
							if (record.target !== scrollerEl) continue;
							for (const added of record.addedNodes) {
								if (added instanceof Element) observer?.observe(added);
							}
							for (const removed of record.removedNodes) {
								if (removed instanceof Element) observer?.unobserve(removed);
							}
						}
					};

					if (typeof MutationObserver !== "undefined") {
						mutations = new MutationObserver((records) => {
							observeRows(records);
							onScrollOrResize();
						});
					}
				} else if (typeof MutationObserver !== "undefined") {
					mutations = new MutationObserver(onScrollOrResize);
				}

				// Content arriving is a change of scroll HEIGHT with every observed
				// border box possibly identical — appended text in a fixed-size
				// child included — so the mutation is a signal of its own, not a
				// stand-in for the resize.
				mutations?.observe(scrollerEl, { childList: true, subtree: true, characterData: true });
			}

			return () => {
				eventTarget.removeEventListener("scroll", onScrollOrResize);
				eventTarget.removeEventListener("resize", onScrollOrResize);
				observer?.disconnect();
				mutations?.disconnect();
				throttled.cancel();
			};
		}, [mode, node, target, label]);

		return (
			<div
				ref={composedRef}
				className={cn("ft-scrollprogress", className)}
				{...restProps}
				data-position={position}
				data-mode={mode}
				role={label !== undefined ? "progressbar" : undefined}
				aria-label={label}
				aria-valuemin={label !== undefined ? 0 : undefined}
				aria-valuemax={label !== undefined ? 100 : undefined}
				aria-valuenow={label !== undefined ? valueNow : undefined}
				aria-hidden={label === undefined ? "true" : undefined}
			>
				<div className="ft-scrollprogress-bar"></div>
			</div>
		);
	}
);

ScrollProgress.displayName = "ScrollProgress";
