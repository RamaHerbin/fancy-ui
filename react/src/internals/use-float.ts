/**
 * Floating element positioning — the DOM-observing half of `float.ts`.
 *
 * `attachFloat` is the framework-free core (the Svelte `float` action's exact
 * body, ported as-is: same rAF coalescing, same ResizeObserver watch on the
 * float and its anchor, same visibility hiding while a getter anchor has
 * nothing to point at). `useFloat` is a thin React binding on top, shaped
 * like `use-anchor-position.ts`: a node-first hook that mounts and destroys
 * the core in a layout effect (a post-paint position is a visible jump from
 * the origin) and returns the placement as actually resolved.
 */

import { useRef, useState } from "react";
import { useEventCallback } from "./dom/use-event-callback.js";
import { useIsomorphicLayoutEffect } from "./dom/ssr.js";
import { computeFloatPosition } from "./float.js";
import type { FloatOptions, FloatPlacement, FloatRect } from "./float.js";

const DEFAULT_PLACEMENT: FloatPlacement = "bottom-start";

// =============================================================================
// Core (verbatim body of the Svelte `float` action)
// =============================================================================

/**
 * Internal-only extension of `FloatOptions`: a hook can't observe the
 * placement `attachFloat` writes onto `node.dataset.placement` without a
 * callback, so the hook layer threads one through here. Not part of the
 * public `FloatOptions` shape — the ported action test never passes it, and
 * omitting it reproduces the exact original behaviour.
 */
interface AttachFloatOptions extends FloatOptions {
	onPlacement?: (placement: FloatPlacement) => void;
}

export interface FloatHandle {
	/** Swaps the options and re-syncs — the action's `update` under a new name. */
	update(next: AttachFloatOptions): void;
	/** Detaches every listener/observer and strips the node's own styles. */
	destroy(): void;
}

function readAnchor(anchor: FloatOptions["anchor"]): FloatRect | null {
	if (typeof anchor === "function") return anchor();
	if (typeof (anchor as HTMLElement).getBoundingClientRect === "function") {
		const { x, y, width, height } = (anchor as HTMLElement).getBoundingClientRect();
		return { x, y, width, height };
	}
	return anchor as FloatRect;
}

function anchorElement(anchor: FloatOptions["anchor"]): HTMLElement | null {
	if (typeof anchor !== "object" || anchor === null) return null;
	return typeof (anchor as HTMLElement).getBoundingClientRect === "function"
		? (anchor as HTMLElement)
		: null;
}

/**
 * Positions `node` with `position: fixed` against a live anchor, using
 * `computeFloatPosition`. Recomputes on scroll/resize (coalesced into one
 * rAF) and on a ResizeObserver watching both the float and its anchor
 * element. SSR-safe: does nothing when `window` is unavailable.
 */
export function attachFloat(node: HTMLElement, opts: AttachFloatOptions): FloatHandle {
	if (typeof window === "undefined") {
		return { update() {}, destroy() {} };
	}

	let options = opts;
	let frame: number | null = null;
	let listening = false;
	let sizes: ResizeObserver | null = null;
	let reportedPlacement: FloatPlacement | null = null;

	const position = () => {
		// Out of flow *before* the anchor is measured. A float rendered as a
		// sibling of its anchor still occupies a slot in the layout until this
		// line runs, and that slot pushes the anchor somewhere it will not be
		// once the float is fixed — so a rect read first describes a position
		// that no longer exists, and the float lands beside it for good.
		node.style.position = "fixed";
		node.style.visibility = "";

		const anchor = readAnchor(options.anchor);
		if (!anchor) {
			node.style.visibility = "hidden";
			return;
		}
		// Still ahead of the node's own measurement: a forced width changes how
		// the content wraps, and therefore the height the placement is computed
		// from.
		node.style.width = options.matchWidth ? `${anchor.width}px` : "";

		const box = node.getBoundingClientRect();
		const { top, left, placement } = computeFloatPosition(
			anchor,
			{ width: box.width, height: box.height },
			{ width: window.innerWidth, height: window.innerHeight },
			{
				placement: options.placement ?? "bottom-start",
				offset: options.offset ?? 6,
				padding: options.padding ?? 8,
			}
		);
		node.style.top = `${top}px`;
		node.style.left = `${left}px`;
		node.dataset.placement = placement;

		if (placement !== reportedPlacement) {
			reportedPlacement = placement;
			options.onPlacement?.(placement);
		}
	};

	const schedule = () => {
		if (frame !== null) return;
		frame = requestAnimationFrame(() => {
			frame = null;
			position();
		});
	};

	/*
	 * Scroll and resize only cover the viewport moving under the pair. A menu
	 * whose results arrive asynchronously, a font swap, or an anchor that grows
	 * changes the geometry with no global event to hear, leaving the float
	 * stale against its anchor or overflowing the edge it was flipped away
	 * from. Re-observed on every sync because `update` may hand over another
	 * anchor.
	 */
	const observeSizes = () => {
		if (typeof ResizeObserver === "undefined") return;
		sizes ??= new ResizeObserver(schedule);
		sizes.disconnect();
		sizes.observe(node);
		const anchor = anchorElement(options.anchor);
		if (anchor) sizes.observe(anchor);
	};

	const listen = (on: boolean) => {
		if (on === listening) return;
		listening = on;
		if (on) {
			window.addEventListener("scroll", schedule, { capture: true, passive: true });
			window.addEventListener("resize", schedule, { passive: true });
		} else {
			window.removeEventListener("scroll", schedule, { capture: true });
			window.removeEventListener("resize", schedule);
			sizes?.disconnect();
			sizes = null;
		}
	};

	const reset = () => {
		if (frame !== null) cancelAnimationFrame(frame);
		frame = null;
		node.style.position = "";
		node.style.top = "";
		node.style.left = "";
		node.style.width = "";
		node.style.visibility = "";
		delete node.dataset.placement;
	};

	const sync = () => {
		if (options.enabled === false) {
			listen(false);
			reset();
			return;
		}
		listen(true);
		observeSizes();
		position();
	};

	sync();

	return {
		update(next: AttachFloatOptions) {
			options = next;
			sync();
		},
		destroy() {
			listen(false);
			sizes?.disconnect();
			sizes = null;
			if (frame !== null) cancelAnimationFrame(frame);
			frame = null;
		},
	};
}

// =============================================================================
// Hook
// =============================================================================

export interface UseFloatResult {
	/** The placement as actually resolved — flipped when the requested side ran out of room. */
	readonly placement: FloatPlacement;
}

/**
 * Positions `node` with `position: fixed` against `options.anchor`. Mirrors
 * `useAnchorPosition`'s shape: one layout effect keyed `[node]` mounts and
 * destroys the core, a second re-syncs whenever an option that affects
 * geometry changes, and the resolved placement is returned rather than
 * discarded — the same collapse `useAnchorPosition`'s `onPlacement` return
 * value buys its own callers.
 */
export function useFloat(node: HTMLElement | null, options: FloatOptions): UseFloatResult {
	const handleRef = useRef<FloatHandle | null>(null);
	const [placement, setPlacement] = useState<FloatPlacement>(options.placement ?? DEFAULT_PLACEMENT);
	const onPlacement = useEventCallback((next: FloatPlacement) => setPlacement(next));

	// Mount/destroy the core once per node. The update effect below runs on
	// the same commit and re-syncs against the current options immediately,
	// so this only ever positions with a momentarily stale option set when
	// both effects fire together at mount — exactly the anchor-position
	// pattern this hook mirrors.
	useIsomorphicLayoutEffect(() => {
		if (!node) return;
		const handle = attachFloat(node, { ...options, onPlacement });
		handleRef.current = handle;
		return () => {
			handle.destroy();
			handleRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [node]);

	useIsomorphicLayoutEffect(() => {
		handleRef.current?.update({ ...options, onPlacement });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		node,
		options.anchor,
		options.placement,
		options.offset,
		options.padding,
		options.matchWidth,
		options.enabled,
		onPlacement,
	]);

	return { placement };
}

// Re-exported so a consumer of the hook module never needs a second import
// from "./float.js" for the option/placement types it already has to name.
export type { FloatOptions, FloatPlacement, FloatRect } from "./float.js";
