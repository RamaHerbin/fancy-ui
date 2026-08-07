/**
 * Floating element positioning.
 *
 * A pure geometry helper plus a thin Svelte action that pins a floating node
 * (menu, popover, completion list) to an anchor. The anchor can be a real
 * element or a virtual rect, which is how a caret-following menu is placed.
 */

import type { ActionReturn } from "svelte/action";

// =============================================================================
// Types
// =============================================================================

export type FloatPlacement =
	| "top"
	| "bottom"
	| "top-start"
	| "bottom-start"
	| "top-end"
	| "bottom-end";

export interface FloatRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface FloatSize {
	width: number;
	height: number;
}

export interface FloatOptions {
	/** Real element, a fixed rect, or a getter returning the current rect (caret anchoring). */
	anchor: HTMLElement | FloatRect | (() => FloatRect | null);
	placement?: FloatPlacement;
	offset?: number;
	padding?: number;
	/** Force the float to the anchor's width before measuring. */
	matchWidth?: boolean;
	enabled?: boolean;
}

type Side = "top" | "bottom";
type Align = "start" | "end" | "center";

// =============================================================================
// Pure compute
// =============================================================================

function clamp(value: number, min: number, max: number): number {
	// When max < min (float larger than the viewport) the min bound wins, so an
	// oversized float overflows off the far edge rather than the near one.
	return Math.max(min, Math.min(value, max));
}

function splitPlacement(placement: FloatPlacement): { side: Side; align: Align } {
	const [side, align] = placement.split("-") as [Side, Exclude<Align, "center"> | undefined];
	return { side, align: align ?? "center" };
}

function joinPlacement(side: Side, align: Align): FloatPlacement {
	return (align === "center" ? side : `${side}-${align}`) as FloatPlacement;
}

/**
 * Resolve the viewport-space position of a floating box against its anchor.
 *
 * Flips to the opposite side only when the requested side cannot hold the float
 * *and* the opposite side has strictly more room. If neither side fits, the
 * larger one is kept — overflowing where the least content is hidden.
 */
export function computeFloatPosition(
	anchor: FloatRect,
	float: FloatSize,
	viewport: FloatSize,
	opts: { placement: FloatPlacement; offset: number; padding: number }
): { top: number; left: number; placement: FloatPlacement } {
	const { offset, padding } = opts;
	const { side, align } = splitPlacement(opts.placement);

	const roomBelow = viewport.height - (anchor.y + anchor.height) - offset - padding;
	const roomAbove = anchor.y - offset - padding;
	const wanted = side === "bottom" ? roomBelow : roomAbove;
	const opposite = side === "bottom" ? roomAbove : roomBelow;
	const flipped = float.height > wanted && opposite > wanted;
	const finalSide: Side = flipped ? (side === "bottom" ? "top" : "bottom") : side;

	const top =
		finalSide === "bottom" ? anchor.y + anchor.height + offset : anchor.y - float.height - offset;
	const left =
		align === "start"
			? anchor.x
			: align === "end"
				? anchor.x + anchor.width - float.width
				: anchor.x + anchor.width / 2 - float.width / 2;

	return {
		top: clamp(top, padding, viewport.height - float.height - padding),
		left: clamp(left, padding, viewport.width - float.width - padding),
		placement: joinPlacement(finalSide, align),
	};
}

// =============================================================================
// Action
// =============================================================================

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

export function float(node: HTMLElement, opts: FloatOptions): ActionReturn<FloatOptions> {
	let options = opts;
	let frame: number | null = null;
	let listening = false;
	let sizes: ResizeObserver | null = null;

	const position = () => {
		// Out of flow *before* the anchor is measured. A float rendered as a sibling
		// of its anchor still occupies a slot in the layout until this line runs,
		// and that slot pushes the anchor somewhere it will not be once the float
		// is fixed — so a rect read first describes a position that no longer
		// exists, and the float lands beside it for good.
		node.style.position = "fixed";
		node.style.visibility = "";

		const anchor = readAnchor(options.anchor);
		if (!anchor) {
			node.style.visibility = "hidden";
			return;
		}
		// Still ahead of the node's own measurement: a forced width changes how the
		// content wraps, and therefore the height the placement is computed from.
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
	 * changes the geometry with no global event to hear, leaving the float stale
	 * against its anchor or overflowing the edge it was flipped away from.
	 * Re-observed on every sync because `update` may hand over another anchor.
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
		update(next: FloatOptions) {
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
