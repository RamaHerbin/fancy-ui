/**
 * Autoscroll (scroll anchor)
 *
 * Keeps a scrollable container pinned to its bottom edge while new content
 * streams in, and lets go the moment the reader scrolls up to look back.
 *
 * "Stuck" is a pure function of the distance from the bottom, recomputed on
 * every scroll event. There is no programmatic-scroll flag to get out of sync:
 * whatever the scrollbar says is the truth.
 */

import type { ActionReturn } from "svelte/action";

export interface AutoscrollOptions {
	/** Set to false to release the container and disconnect every listener. */
	enabled?: boolean;
	/** How close to the bottom (px) still counts as pinned. */
	bottomThreshold?: number;
	/**
	 * Start pinned and jump to the bottom on connect, whatever the container's
	 * scroll position says. For a region that mounts with content already in it —
	 * a reasoning trace joined mid-stream, a replayed transcript — a fresh
	 * container sits at scrollTop 0, which reads as "the reader scrolled up" and
	 * would leave every later chunk stranded at the top.
	 */
	pinOnConnect?: boolean;
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

	/*
	 * The container itself has a fixed height, so watching only it misses every
	 * way already-rendered content grows without touching the child list: an image
	 * finishing its download, a web font swapping in, a row expanding under CSS.
	 * Watching the rows too catches those, and tracking them through the mutation
	 * records keeps the cost proportional to what changed rather than re-walking
	 * the whole transcript on every streamed token.
	 */
	function observeRows(records: MutationRecord[]): void {
		if (!resizes) return;
		for (const record of records) {
			if (record.target !== node) continue;
			for (const added of record.addedNodes) {
				if (added instanceof Element) resizes.observe(added);
			}
			for (const removed of record.removedNodes) {
				if (removed instanceof Element) resizes.unobserve(removed);
			}
		}
	}

	/*
	 * Content can reach the bottom edge without anyone scrolling — a row removed,
	 * a collapsed block, a container that grew taller than its content. Nothing
	 * fires a scroll event for that, so without this the container stays released
	 * for good. Only ever re-sticks: growth momentarily puts new content below the
	 * viewport, and unsticking on that would cancel the very pin it is about to do.
	 */
	function restick(): void {
		if (stuck || !isAtBottom()) return;
		stuck = true;
		options.onStickChange?.(true);
	}

	function handleMutations(records: MutationRecord[]): void {
		observeRows(records);
		restick();
		schedulePin();
	}

	function handleResize(): void {
		restick();
		schedulePin();
	}

	function connect(): void {
		if (connected) return;
		connected = true;
		if (options.pinOnConnect) {
			stuck = true;
			node.scrollTop = node.scrollHeight;
		}
		node.addEventListener("scroll", handleScroll, { passive: true });
		mutations = new MutationObserver(handleMutations);
		mutations.observe(node, { childList: true, subtree: true, characterData: true });
		if (typeof ResizeObserver !== "undefined") {
			resizes = new ResizeObserver(handleResize);
			resizes.observe(node);
			for (const row of node.children) resizes.observe(row);
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
			const wasConnected = connected;
			options = next;
			if (next.enabled === false) {
				disconnect();
				return;
			}
			connect();
			// A threshold handed over mid-flight changes the answer to "is this
			// pinned?" with nothing else moving, and connect() is a no-op on an
			// already-connected container, so the reading is refreshed here.
			if (wasConnected) handleScroll();
		},
		destroy: disconnect,
	};
}
