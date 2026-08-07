/**
 * Autoscroll (scroll anchor)
 *
 * Keeps a scrollable container pinned to its bottom edge while new content
 * streams in, and lets go the moment the reader scrolls up to look back.
 *
 * "Stuck" is a pure function of the distance from the bottom, recomputed on
 * every scroll event and again whenever the action reconnects. There is no
 * programmatic-scroll flag to get out of sync: whatever the scrollbar says is
 * the truth.
 */

import type { ActionReturn } from "svelte/action";

export interface AutoscrollOptions {
	/** Set to false to release the container and disconnect every listener. */
	enabled?: boolean;
	/** How close to the bottom (px) still counts as pinned. */
	bottomThreshold?: number;
	/** Called only when the pinned state flips, never on every scroll. */
	onStickChange?: (stuck: boolean) => void;
}

const DEFAULT_BOTTOM_THRESHOLD = 40;

/** Jump a container to its bottom. Smooth by default. */
export function scrollToBottom(node: HTMLElement, behavior: ScrollBehavior = "smooth"): void {
	if (typeof node.scrollTo === "function") {
		node.scrollTo({ top: node.scrollHeight, behavior });
	} else {
		node.scrollTop = node.scrollHeight;
	}
}

export function autoscroll(
	node: HTMLElement,
	opts: AutoscrollOptions = {}
): ActionReturn<AutoscrollOptions> {
	let options = opts;
	let frame: number | null = null;
	let mutations: MutationObserver | null = null;
	let resizes: ResizeObserver | null = null;
	let connected = false;

	function isAtBottom(): boolean {
		const threshold = options.bottomThreshold ?? DEFAULT_BOTTOM_THRESHOLD;
		return node.scrollHeight - node.scrollTop - node.clientHeight <= threshold;
	}

	// Content that fits its container counts as pinned.
	let stuck = isAtBottom();

	function handleScroll(): void {
		const next = isAtBottom();
		if (next === stuck) return;
		stuck = next;
		options.onStickChange?.(next);
	}

	function pin(): void {
		frame = null;
		// The reader may have scrolled away between the mutation and this frame.
		if (!stuck) return;
		// Always instant: a smooth scroll still in flight reads as "not at the
		// bottom" on the next scroll event, which would unstick us mid-animation.
		node.scrollTop = node.scrollHeight;
	}

	function schedulePin(): void {
		if (!stuck || frame !== null) return;
		frame = requestAnimationFrame(pin);
	}

	function connect(): void {
		if (connected) return;
		connected = true;
		// Anything at all may have happened while we were disconnected — the reader
		// scrolling, the transcript growing, the container being resized — and none
		// of it reached the stored answer, so it is re-read rather than trusted.
		// Silent when nothing moved, which is the case on the very first connect.
		handleScroll();
		node.addEventListener("scroll", handleScroll, { passive: true });
		mutations = new MutationObserver(schedulePin);
		mutations.observe(node, { childList: true, subtree: true, characterData: true });
		if (typeof ResizeObserver !== "undefined") {
			resizes = new ResizeObserver(schedulePin);
			resizes.observe(node);
		}
	}

	function disconnect(): void {
		connected = false;
		node.removeEventListener("scroll", handleScroll);
		mutations?.disconnect();
		mutations = null;
		resizes?.disconnect();
		resizes = null;
		if (frame !== null) {
			cancelAnimationFrame(frame);
			frame = null;
		}
	}

	if (options.enabled !== false) connect();

	return {
		update(next: AutoscrollOptions = {}) {
			options = next;
			if (next.enabled === false) disconnect();
			else connect();
		},
		destroy: disconnect,
	};
}
