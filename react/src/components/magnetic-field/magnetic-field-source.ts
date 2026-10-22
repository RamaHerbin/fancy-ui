/**
 * MagneticField input adapters — framework-free, byte-identical in the Svelte,
 * React and Vue trees (listed explicitly in shared-cores.json).
 *
 * The core (`magnetic-field-core.ts`) never listens to anything: it is fed a
 * magnet position per channel and told when the layout may have moved. This
 * module owns the two listener sets that do the feeding:
 *
 * - `attachPointerSource` turns a mouse or pen anywhere on the page into the
 *   `"pointer"` channel. It listens on the DOCUMENT, not the field root: the
 *   pull reaches `radius` px beyond every item, so most of the approach
 *   happens outside the root's box. The component gates the attachment with an
 *   in-view observer whose margin is that radius, so an off-screen field costs
 *   nothing.
 * - `attachLayoutInvalidation` tells the core that rects may be stale after a
 *   scroll (of the page or of any scrolling ancestor) or a window resize.
 *
 * Handlers never compute anything: they store the latest client position in
 * the core, which coalesces to at most one target pass per frame.
 *
 * Both functions return their own teardown and are safe to call during SSR
 * (they attach nothing and return a no-op). No browser global is touched at
 * import time.
 */

import type { MagneticFieldCore } from "./magnetic-field-core.js";

const NOOP = () => {};

/** The root class every stack's `MagnetPuck` renders. */
const PUCK_SELECTOR = ".ft-magnet-puck";

/**
 * Feeds the core's `"pointer"` channel from a mouse or pen moving anywhere on
 * `target` (the current document by default).
 *
 * - Touch is ignored: a finger has no hover, and a tap would yank the items
 *   toward it for one frame and drop them. Touch users drive the field with a
 *   `MagnetPuck` instead.
 * - Only the primary pointer counts, so a second pen or mouse cannot fight the
 *   first.
 * - A pointer over a `MagnetPuck` (hovering it, or dragging it with pointer
 *   capture) clears the channel instead of feeding it: the puck is the magnet
 *   there. Otherwise, letting go of a puck would release nothing, since the
 *   cursor resting on it would take over at the very same point. The channel
 *   comes back as soon as the pointer moves off the puck.
 * - The channel is cleared when the pointer leaves the page (to the browser
 *   chrome, another window, or a pen lifted out of hover range), when the
 *   window loses focus (a keyboard tab switch moves no pointer), and when the
 *   page is hidden. Without these, the last pull would freeze on screen until
 *   the pointer came back.
 */
export function attachPointerSource(
	core: Pick<MagneticFieldCore, "setClientSource" | "clearSource">,
	target?: Document
): () => void {
	const doc = target ?? (typeof document === "undefined" ? undefined : document);
	if (!doc) return NOOP;
	const win = doc.defaultView;

	const clear = () => core.clearSource("pointer");

	const onMove = (event: PointerEvent) => {
		if (event.pointerType === "touch" || !event.isPrimary) return;
		const target = event.target as Element | null;
		if (typeof target?.closest === "function" && target.closest(PUCK_SELECTOR)) {
			clear();
			return;
		}
		core.setClientSource(event.clientX, event.clientY, "pointer");
	};

	// `pointerout` bubbles, and its `relatedTarget` is null exactly when the
	// pointer left the document (or a pen left hover range), which makes it the
	// dependable "left the page" signal. `pointerleave` on the document is kept
	// as well: some engines fire it there and not the former in edge cases.
	const onOut = (event: PointerEvent) => {
		if (event.pointerType === "touch" || !event.isPrimary) return;
		if (event.relatedTarget === null) clear();
	};

	const onLeave = (event: PointerEvent) => {
		if (event.pointerType === "touch") return;
		clear();
	};

	const onVisibility = () => {
		if (doc.visibilityState === "hidden") clear();
	};

	doc.addEventListener("pointermove", onMove, { passive: true });
	doc.addEventListener("pointerout", onOut, { passive: true });
	doc.addEventListener("pointerleave", onLeave, { passive: true });
	doc.addEventListener("visibilitychange", onVisibility);
	win?.addEventListener("blur", clear);

	return () => {
		doc.removeEventListener("pointermove", onMove);
		doc.removeEventListener("pointerout", onOut);
		doc.removeEventListener("pointerleave", onLeave);
		doc.removeEventListener("visibilitychange", onVisibility);
		win?.removeEventListener("blur", clear);
		clear();
	};
}

/**
 * Calls `core.invalidate()` whenever the field may have moved on screen
 * without resizing: a scroll of the page or of any scrolling ancestor
 * (captured on the window, since `scroll` does not bubble), or a window
 * resize. Size changes of the root and the items themselves are the core's
 * own `ResizeObserver`'s job.
 *
 * `invalidate()` only marks the cached rects dirty and wakes the loop when
 * something is engaged, so a fast scroll costs one rect read per frame at most.
 */
export function attachLayoutInvalidation(core: Pick<MagneticFieldCore, "invalidate">): () => void {
	if (typeof window === "undefined") return NOOP;
	const win = window;
	const onChange = () => core.invalidate();

	win.addEventListener("scroll", onChange, { capture: true, passive: true });
	win.addEventListener("resize", onChange, { passive: true });

	return () => {
		win.removeEventListener("scroll", onChange, { capture: true });
		win.removeEventListener("resize", onChange);
	};
}
