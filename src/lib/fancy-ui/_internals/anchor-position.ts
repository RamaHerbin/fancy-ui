// Framework-agnostic floating-element positioning: given an anchor rect and
// the size of a floating element (popover / tooltip / menu), computes the
// x/y coordinates that place it on the requested side, aligned against the
// anchor, offset away from it, flipped to the opposite side when it would
// overflow the viewport, and clamped so it never renders off-screen.
//
// `computePosition` is a pure function: it takes a DOMRect-shaped anchor and
// plain dimensions, so it is fully testable without a DOM. `anchorPosition`
// is the Svelte action that wires it up to a live anchor element.
//
// Usage:
//   const { x, y, side } = computePosition(anchorEl.getBoundingClientRect(), { width: 200, height: 40 });
//
//   <div use:anchorPosition={{ anchor: () => anchorEl, side: "bottom" }}>...</div>

import type { Action } from "svelte/action";

export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

export interface ComputePositionOptions {
	/** Side of the anchor to place the floating element on. Defaults to "bottom". */
	side?: Side;
	/** Alignment along the cross axis of `side`. Defaults to "center". */
	align?: Align;
	/** Gap in pixels between the anchor and the floating element. Defaults to 8. */
	offset?: number;
	/** Viewport bounds used for flip/clamp. Defaults to `window` when available, otherwise unbounded (SSR). */
	viewport?: { width: number; height: number };
	/** Flip to the opposite side when the requested side would overflow the viewport. Defaults to true. */
	flip?: boolean;
}

export interface ComputePositionResult {
	x: number;
	y: number;
	/** The side actually used, which may differ from the requested one when flipped. */
	side: Side;
	/**
	 * The cross-axis alignment the element actually ended up with, which
	 * differs from the requested one whenever clamping slid it along that
	 * axis. Read it — not the requested `align` — for anything that has to
	 * point back at the anchor, such as a transform origin or a caret.
	 */
	align: Align;
}

const OPPOSITE_SIDE: Record<Side, Side> = {
	top: "bottom",
	bottom: "top",
	left: "right",
	right: "left",
};

function isHorizontalSide(side: Side): boolean {
	return side === "top" || side === "bottom";
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, max));
}

function getDefaultViewport(): { width: number; height: number } {
	if (typeof window !== "undefined") {
		return { width: window.innerWidth, height: window.innerHeight };
	}
	// SSR fallback: no viewport to overflow against, so flip/clamp become no-ops.
	return { width: Number.POSITIVE_INFINITY, height: Number.POSITIVE_INFINITY };
}

/** Whether placing the floating element on `side` would overflow the viewport. */
function overflows(
	side: Side,
	anchor: DOMRect,
	floating: { width: number; height: number },
	offset: number,
	viewport: { width: number; height: number }
): boolean {
	switch (side) {
		case "top":
			return anchor.top - floating.height - offset < 0;
		case "bottom":
			return anchor.bottom + offset + floating.height > viewport.height;
		case "left":
			return anchor.left - floating.width - offset < 0;
		case "right":
			return anchor.right + offset + floating.width > viewport.width;
	}
}

/** Computes the raw (unclamped) x/y for `side` + `align`, before flip/clamp are applied. */
function placeAt(
	side: Side,
	anchor: DOMRect,
	floating: { width: number; height: number },
	align: Align,
	offset: number
): { x: number; y: number } {
	if (isHorizontalSide(side)) {
		const y = side === "top" ? anchor.top - floating.height - offset : anchor.bottom + offset;
		let x: number;
		switch (align) {
			case "start":
				x = anchor.left;
				break;
			case "end":
				x = anchor.right - floating.width;
				break;
			default:
				x = anchor.left + anchor.width / 2 - floating.width / 2;
		}
		return { x, y };
	}

	const x = side === "left" ? anchor.left - floating.width - offset : anchor.right + offset;
	let y: number;
	switch (align) {
		case "start":
			y = anchor.top;
			break;
		case "end":
			y = anchor.bottom - floating.height;
			break;
		default:
			y = anchor.top + anchor.height / 2 - floating.height / 2;
	}
	return { x, y };
}

/**
 * Where the anchor's cross-axis centre falls inside the element as finally
 * placed, expressed in the same vocabulary as the requested `align`.
 *
 * The requested alignment cannot answer this: clamping moves x/y without
 * touching either input, so a menu asked for `align: "start"` next to the
 * viewport's right edge is reported as `start` while the anchor now sits by
 * its right edge. Deriving from the clamped coordinates keeps that honest.
 * The thirds are the natural split of the three-value vocabulary.
 */
function resolveAlign(
	side: Side,
	anchor: DOMRect,
	floating: { width: number; height: number },
	x: number,
	y: number,
	requested: Align
): Align {
	const horizontal = isHorizontalSide(side);
	const extent = horizontal ? floating.width : floating.height;
	// A zero-size element has no inside for the anchor to fall in — an
	// unlaid-out first frame, a `display: none` ancestor, or jsdom, where
	// every element measures zero. Nothing was clamped in that state either,
	// so the requested alignment is both the honest answer and the one that
	// keeps a never-measured panel behaving exactly as it did before.
	if (extent <= 0) return requested;

	const anchorCentre = horizontal ? anchor.left + anchor.width / 2 : anchor.top + anchor.height / 2;
	const ratio = (anchorCentre - (horizontal ? x : y)) / extent;

	if (ratio < 1 / 3) return "start";
	if (ratio > 2 / 3) return "end";
	return "center";
}

/**
 * Computes where to place a floating element relative to an anchor rect.
 *
 * Pure function — no DOM access, so it is testable with plain objects that
 * satisfy the `DOMRect` shape.
 */
export function computePosition(
	anchor: DOMRect,
	floating: { width: number; height: number },
	opts: ComputePositionOptions = {}
): ComputePositionResult {
	const { side = "bottom", align = "center", offset = 8, flip = true } = opts;
	const viewport = opts.viewport ?? getDefaultViewport();

	const resolvedSide =
		flip && overflows(side, anchor, floating, offset, viewport) ? OPPOSITE_SIDE[side] : side;

	const { x, y } = placeAt(resolvedSide, anchor, floating, align, offset);

	const maxX = Math.max(0, viewport.width - floating.width);
	const maxY = Math.max(0, viewport.height - floating.height);

	const clampedX = clamp(x, 0, maxX);
	const clampedY = clamp(y, 0, maxY);

	return {
		x: clampedX,
		y: clampedY,
		side: resolvedSide,
		align: resolveAlign(resolvedSide, anchor, floating, clampedX, clampedY, align),
	};
}

export interface AnchorPositionOptions {
	/** Resolves the current anchor element. Called on every recompute so it can track a moving target. */
	anchor: () => HTMLElement | null;
	side?: Side;
	align?: Align;
	offset?: number;
	/**
	 * Called with the side the element was actually placed on, which differs
	 * from the requested `side` whenever a flip occurred, and with the
	 * cross-axis alignment it actually ended up with, which differs from the
	 * requested `align` whenever clamping slid it along that axis. Fires once
	 * on the initial placement and thereafter only when either resolved value
	 * changes, so a consumer can react (move a caret, set a transform origin,
	 * mirror a submenu's open direction) without re-rendering on every scroll
	 * frame.
	 *
	 * Without this, `computePosition`'s resolved placement is computed and
	 * discarded here, and a consumer has no way to learn a flip or a clamp
	 * happened.
	 */
	onPlacement?: (side: Side, align: Align) => void;
}

/**
 * Svelte action that positions `node` with `position: fixed` against a live
 * anchor element, using `computePosition`. Recomputes on scroll and resize
 * (passive, capturing listeners so nested scroll containers are caught too)
 * and cleans up its listeners on destroy.
 *
 * SSR-safe: does nothing when `window` is unavailable.
 */
export const anchorPosition: Action<HTMLElement, AnchorPositionOptions> = (node, opts) => {
	if (typeof window === "undefined") {
		return {};
	}

	let options = opts;
	// The last placement reported through `onPlacement`, so a scroll or resize
	// that recomputes to the same one stays silent. `null` means "nothing
	// reported yet", which is distinct from any real value and makes the first
	// placement always fire.
	let reportedSide: Side | null = null;
	let reportedAlign: Align | null = null;

	function update(): void {
		const anchorEl = options.anchor();
		if (!anchorEl) return;

		const anchorRect = anchorEl.getBoundingClientRect();
		const floatingRect = node.getBoundingClientRect();
		const { x, y, side, align } = computePosition(
			anchorRect,
			{ width: floatingRect.width, height: floatingRect.height },
			{
				side: options.side,
				align: options.align,
				offset: options.offset,
				viewport: { width: window.innerWidth, height: window.innerHeight },
			}
		);

		node.style.position = "fixed";
		node.style.left = `${x}px`;
		node.style.top = `${y}px`;

		if (side !== reportedSide || align !== reportedAlign) {
			reportedSide = side;
			reportedAlign = align;
			options.onPlacement?.(side, align);
		}
	}

	update();

	window.addEventListener("scroll", update, { passive: true, capture: true });
	window.addEventListener("resize", update, { passive: true });

	return {
		update(newOpts: AnchorPositionOptions) {
			// A new `onPlacement` is a new listener that has never been told
			// anything, so it gets a report even if the side did not move.
			// Without this, the idiomatic Svelte call site — an inline arrow
			// in the action's options object, rebuilt on every re-render —
			// silently never fires after the first one: `reportedSide` is
			// scoped to the node, not to the callback, so the gate that exists
			// to suppress duplicate reports to the *same* listener ends up
			// suppressing the first report to a *different* one.
			if (newOpts.onPlacement !== options.onPlacement) {
				reportedSide = null;
				reportedAlign = null;
			}
			options = newOpts;
			update();
		},
		destroy() {
			window.removeEventListener("scroll", update, { capture: true });
			window.removeEventListener("resize", update);
		},
	};
};
