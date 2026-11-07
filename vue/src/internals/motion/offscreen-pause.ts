/**
 * Marks a decorative element with `data-ft-offscreen` while it is out of view,
 * so a stylesheet can freeze its CSS loop: `[data-ft-offscreen] .x
 * { animation-play-state: paused; }`.
 *
 * Why `animation-play-state` and not `content-visibility: auto`: size
 * containment collapses a decorative border or beam while it is off screen,
 * breaks `offset-path` sizing and breaks SVG path-length layouts. `paused`
 * keeps the phase, resumes seamlessly and costs nothing while the element is
 * visible.
 *
 * Observes with a 256px margin so the loop is already running again by the time
 * the element scrolls in. Without IntersectionObserver (SSR, old browsers) the
 * attribute is never set and the loop simply keeps running.
 */
import { inView } from "./in-view.js";

export const OFFSCREEN_ATTR = "data-ft-offscreen";

/** Structural stand-in for `svelte/action`'s `Action` type, kept
 * framework-free so this core has no runtime or type import from svelte. */
type ActionLike<Node extends Element> = (node: Node) => {
	destroy?(): void;
} | void;

export const offscreenPause: ActionLike<Element> = (node) => {
	if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return {};
	const handle = inView(node, {
		once: false,
		threshold: 0,
		rootMargin: "256px",
		onChange: (visible) => node.toggleAttribute(OFFSCREEN_ATTR, !visible),
	});
	return {
		destroy() {
			handle?.destroy?.();
			node.removeAttribute(OFFSCREEN_ATTR);
		},
	};
};

/**
 * Same as `offscreenPause`, but marks the node's PARENT. For fragment
 * components with no root element of their own (a field of absolutely
 * positioned particles), where the container they sit in is the thing that
 * leaves the screen.
 */
export const offscreenPauseParent: ActionLike<Element> = (node) => {
	const parent = node.parentElement;
	return parent ? offscreenPause(parent) : {};
};
