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
 *
 * Takes the NODE, not a ref (convention C-1), exactly like `useInView`.
 */
import { useIsomorphicLayoutEffect } from "../dom/ssr.js";
import { observeInView } from "./in-view.js";

export const OFFSCREEN_ATTR = "data-ft-offscreen";

export function useOffscreenPause(node: Element | null): void {
	useIsomorphicLayoutEffect(() => {
		if (!node || typeof IntersectionObserver === "undefined") return;
		const handle = observeInView(node, {
			once: false,
			threshold: 0,
			rootMargin: "256px",
			onChange: (visible) => node.toggleAttribute(OFFSCREEN_ATTR, !visible),
		});
		return () => {
			handle.destroy();
			node.removeAttribute(OFFSCREEN_ATTR);
		};
	}, [node]);
}
