/**
 * Floating element positioning — geometry only.
 *
 * A pure geometry helper that pins a floating box (menu, popover, completion
 * list) to an anchor. The anchor can be a real element's rect or a virtual
 * rect, which is how a caret-following menu is placed.
 *
 * `attachFloat` / `useFloat` (the DOM-observing half) are a separate,
 * hook-carrying unit and are not ported here.
 */

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
