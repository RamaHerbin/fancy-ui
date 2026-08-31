import { afterEach, describe, it, expect, vi } from "vitest";
import { attachAnchorPosition, computePosition, type Side } from "./anchor-position.js";

function rect(partial: Partial<DOMRect>): DOMRect {
	const { x = 0, y = 0, width = 0, height = 0 } = partial;
	return {
		x,
		y,
		width,
		height,
		top: y,
		left: x,
		right: x + width,
		bottom: y + height,
		toJSON() {
			return this;
		},
	};
}

const viewport = { width: 1024, height: 768 };

describe("computePosition", () => {
	it("places the floating element below the anchor by default", () => {
		const anchor = rect({ x: 100, y: 100, width: 50, height: 20 });
		const result = computePosition(anchor, { width: 200, height: 40 }, { viewport });

		expect(result.side).toBe("bottom");
		expect(result.y).toBe(anchor.bottom + 8); // default offset
		expect(result.x).toBe(anchor.left + anchor.width / 2 - 100); // centered
	});

	it("places the floating element above the anchor when side is 'top'", () => {
		const anchor = rect({ x: 100, y: 300, width: 50, height: 20 });
		const result = computePosition(anchor, { width: 200, height: 40 }, { side: "top", viewport });

		expect(result.side).toBe("top");
		expect(result.y).toBe(anchor.top - 40 - 8);
	});

	it("respects a custom offset", () => {
		const anchor = rect({ x: 100, y: 100, width: 50, height: 20 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 40 },
			{ side: "bottom", offset: 16, viewport }
		);

		expect(result.y).toBe(anchor.bottom + 16);
	});

	it("aligns to start / end along the cross axis for a horizontal side", () => {
		const anchor = rect({ x: 700, y: 100, width: 50, height: 20 });
		const floating = { width: 100, height: 40 };

		const start = computePosition(anchor, floating, { side: "bottom", align: "start", viewport });
		expect(start.x).toBe(anchor.left);

		const end = computePosition(anchor, floating, { side: "bottom", align: "end", viewport });
		expect(end.x).toBe(anchor.right - floating.width);
	});

	it("aligns to start / end along the cross axis for a vertical side", () => {
		const anchor = rect({ x: 300, y: 100, width: 50, height: 20 });
		const floating = { width: 120, height: 60 };

		const start = computePosition(anchor, floating, { side: "right", align: "start", viewport });
		expect(start.y).toBe(anchor.top);

		const end = computePosition(anchor, floating, { side: "right", align: "end", viewport });
		expect(end.y).toBe(anchor.bottom - floating.height);
	});

	it("flips from bottom to top when there is no room below", () => {
		const anchor = rect({ x: 100, y: 700, width: 50, height: 20 }); // near the bottom edge
		const result = computePosition(
			anchor,
			{ width: 200, height: 100 },
			{ side: "bottom", viewport }
		);

		expect(result.side).toBe("top");
		expect(result.y).toBe(anchor.top - 100 - 8);
	});

	it("flips from top to bottom when there is no room above", () => {
		const anchor = rect({ x: 100, y: 10, width: 50, height: 20 }); // near the top edge
		const result = computePosition(anchor, { width: 200, height: 100 }, { side: "top", viewport });

		expect(result.side).toBe("bottom");
		expect(result.y).toBe(anchor.bottom + 8);
	});

	it("does not flip when flip is disabled, even if it overflows", () => {
		const anchor = rect({ x: 100, y: 700, width: 50, height: 20 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 100 },
			{ side: "bottom", flip: false, viewport }
		);

		expect(result.side).toBe("bottom");
	});

	it("clamps horizontally so the floating element never renders off the left edge", () => {
		const anchor = rect({ x: 5, y: 100, width: 20, height: 20 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 40 },
			{ side: "bottom", align: "center", viewport }
		);

		expect(result.x).toBe(0);
	});

	it("clamps horizontally so the floating element never renders off the right edge", () => {
		const anchor = rect({ x: 1000, y: 100, width: 20, height: 20 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 40 },
			{ side: "bottom", align: "center", viewport }
		);

		expect(result.x).toBe(viewport.width - 200);
	});

	it("clamps vertically within the viewport", () => {
		const anchor = rect({ x: 100, y: -50, width: 50, height: 20 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 40 },
			{ side: "top", flip: false, viewport }
		);

		expect(result.y).toBe(0);
	});

	it("is a pure function that does not require a real DOM", () => {
		const anchor = rect({ x: 0, y: 0, width: 10, height: 10 });
		expect(() =>
			computePosition(anchor, { width: 10, height: 10 }, { viewport: { width: 100, height: 100 } })
		).not.toThrow();
	});
});

// The requested alignment says which corner the caller ASKED for; only the
// clamped coordinates say which corner the anchor actually ends up near. A
// transform origin taken from the request grows the panel out of the corner
// farthest from the click whenever a clamp moved it.
describe("computePosition — resolved cross-axis align", () => {
	it("reports the requested align back when nothing clamped it", () => {
		// Mid-viewport on purpose: at x=100 the end-aligned panel would start at
		// -50 and be clamped to 0, which is the very case the tests below cover.
		const anchor = rect({ x: 400, y: 100, width: 50, height: 20 });

		expect(
			computePosition(anchor, { width: 200, height: 40 }, { align: "start", viewport }).align
		).toBe("start");
		expect(
			computePosition(anchor, { width: 200, height: 40 }, { align: "center", viewport }).align
		).toBe("center");
		expect(
			computePosition(anchor, { width: 200, height: 40 }, { align: "end", viewport }).align
		).toBe("end");
	});

	// The reported case: a right-click near the viewport's right edge, opened
	// bottom/start. The panel is clamped leftward until its RIGHT edge is the
	// one at the pointer, so the origin has to be "end", not the requested
	// "start".
	it("reports 'end' when a start-aligned panel is clamped off the right edge", () => {
		const anchor = rect({ x: 1010, y: 100, width: 0, height: 0 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 40 },
			{ side: "bottom", align: "start", viewport }
		);

		expect(result.x).toBe(viewport.width - 200); // clamped, not anchor.left
		expect(result.align).toBe("end");
	});

	it("reports 'start' when an end-aligned panel is clamped off the left edge", () => {
		const anchor = rect({ x: 4, y: 100, width: 0, height: 0 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 40 },
			{ side: "bottom", align: "end", viewport }
		);

		expect(result.x).toBe(0);
		expect(result.align).toBe("start");
	});

	// Same failure on the other axis: a side-placed panel clamped against the
	// bottom of the viewport.
	it("resolves against the vertical axis for left/right sides", () => {
		const anchor = rect({ x: 100, y: 760, width: 20, height: 0 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 300 },
			{ side: "right", align: "start", viewport }
		);

		expect(result.y).toBe(viewport.height - 300);
		expect(result.align).toBe("end");
	});

	// Every element measures zero in jsdom, so this is the path the component
	// tests take. With no measurable box nothing was clamped either, so the
	// requested alignment is the honest answer — and the one that keeps an
	// unlaid-out first frame pointing where the caller asked.
	it("falls back to the requested align for a zero-size element", () => {
		const anchor = rect({ x: 100, y: 100, width: 50, height: 20 });

		expect(
			computePosition(anchor, { width: 0, height: 0 }, { align: "start", viewport }).align
		).toBe("start");
		expect(computePosition(anchor, { width: 0, height: 0 }, { align: "end", viewport }).align).toBe(
			"end"
		);
	});
});

describe("attachAnchorPosition — onPlacement", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	/**
	 * jsdom gives every element a zero rect, so both the anchor and the
	 * floating node need stubbed geometry for a flip to be reachable at all.
	 * The viewport is jsdom's default 1024x768.
	 */
	function setup(anchorRect: Partial<DOMRect>, floating: { width: number; height: number }) {
		const anchorEl = document.createElement("button");
		const node = document.createElement("div");
		document.body.append(anchorEl, node);

		anchorEl.getBoundingClientRect = () => rect(anchorRect);
		node.getBoundingClientRect = () => rect({ width: floating.width, height: floating.height });

		return { anchorEl, node };
	}

	it("reports the requested side when nothing flips", () => {
		const { anchorEl, node } = setup(
			{ x: 100, y: 100, width: 50, height: 20 },
			{
				width: 200,
				height: 100,
			}
		);
		const seen: Side[] = [];

		const handle = attachAnchorPosition(node, {
			anchor: () => anchorEl,
			side: "bottom",
			onPlacement: (side) => seen.push(side),
		});

		expect(seen).toEqual(["bottom"]);
		handle.destroy();
	});

	it("reports the opposite side when the requested one overflows", () => {
		// 740 + 8 offset + 100 tall = 848, past jsdom's 768-high viewport.
		const { anchorEl, node } = setup(
			{ x: 100, y: 720, width: 50, height: 20 },
			{
				width: 200,
				height: 100,
			}
		);
		const seen: Side[] = [];

		const handle = attachAnchorPosition(node, {
			anchor: () => anchorEl,
			side: "bottom",
			onPlacement: (side) => seen.push(side),
		});

		expect(seen).toEqual(["top"]);
		handle.destroy();
	});

	it("does not re-report while the resolved side stays the same", () => {
		const { anchorEl, node } = setup(
			{ x: 100, y: 100, width: 50, height: 20 },
			{
				width: 200,
				height: 100,
			}
		);
		const onPlacement = vi.fn();

		const handle = attachAnchorPosition(node, { anchor: () => anchorEl, onPlacement });
		window.dispatchEvent(new Event("scroll"));
		window.dispatchEvent(new Event("resize"));

		// One initial placement, and silence for recomputes that land on the
		// same side — otherwise every scroll frame would re-render a caret.
		expect(onPlacement).toHaveBeenCalledTimes(1);
		handle.destroy();
	});

	it("reports again once the resolved side actually changes", () => {
		const anchorEl = document.createElement("button");
		const node = document.createElement("div");
		document.body.append(anchorEl, node);
		node.getBoundingClientRect = () => rect({ width: 200, height: 100 });

		let anchorTop = 100;
		anchorEl.getBoundingClientRect = () => rect({ x: 100, y: anchorTop, width: 50, height: 20 });

		const seen: Side[] = [];
		const handle = attachAnchorPosition(node, {
			anchor: () => anchorEl,
			side: "bottom",
			onPlacement: (side) => seen.push(side),
		});

		// The anchor scrolls down far enough that "bottom" no longer fits.
		anchorTop = 720;
		window.dispatchEvent(new Event("scroll"));

		expect(seen).toEqual(["bottom", "top"]);
		handle.destroy();
	});

	it("reports to a replacement callback even though the side has not moved", () => {
		const { anchorEl, node } = setup(
			{ x: 100, y: 100, width: 50, height: 20 },
			{ width: 200, height: 100 }
		);
		const first = vi.fn();
		const second = vi.fn();

		const handle = attachAnchorPosition(node, {
			anchor: () => anchorEl,
			side: "bottom",
			onPlacement: first,
		});
		expect(first).toHaveBeenCalledTimes(1);

		// What an inline arrow in the options object produces on every
		// re-render: identical geometry, a brand-new function. It has never
		// been told the side, so silence here would leave it permanently
		// uninformed — the gate exists to suppress duplicate reports to the
		// same listener, not the first report to a new one.
		handle.update({
			anchor: () => anchorEl,
			side: "bottom",
			onPlacement: second,
		});

		expect(second).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledWith("bottom", "center");
		expect(first).toHaveBeenCalledTimes(1);
		handle.destroy();
	});

	it("still stays silent for a same-callback update with an unchanged side", () => {
		const { anchorEl, node } = setup(
			{ x: 100, y: 100, width: 50, height: 20 },
			{ width: 200, height: 100 }
		);
		const onPlacement = vi.fn();
		const opts = { anchor: () => anchorEl, side: "bottom" as const, onPlacement };

		const handle = attachAnchorPosition(node, opts);
		handle.update({ ...opts, offset: 12 });

		expect(onPlacement).toHaveBeenCalledTimes(1);
		handle.destroy();
	});

	// `recompute()` has no Svelte counterpart: the action recomputed only from
	// its own listeners or an options swap. The handle exposes it for a caller
	// that knows the geometry moved without any option changing.
	it("recomputes against the current options without swapping them", () => {
		const anchorEl = document.createElement("button");
		const node = document.createElement("div");
		document.body.append(anchorEl, node);
		node.getBoundingClientRect = () => rect({ width: 200, height: 100 });

		let anchorTop = 100;
		anchorEl.getBoundingClientRect = () => rect({ x: 100, y: anchorTop, width: 50, height: 20 });

		const seen: Side[] = [];
		const handle = attachAnchorPosition(node, {
			anchor: () => anchorEl,
			side: "bottom",
			onPlacement: (side) => seen.push(side),
		});
		expect(node.style.top).toBe("128px");

		anchorTop = 720;
		handle.recompute();

		expect(seen).toEqual(["bottom", "top"]);
		expect(node.style.top).toBe("612px"); // 720 - 100 - 8, flipped above
		handle.destroy();
	});

	// The Svelte action leaves these behind, which is unobservable there:
	// an action is destroyed only with the element it is attached to. The
	// React binding's `enabled: false` tears the handle down while the node
	// stays mounted, and the leftovers then read as a surface frozen at
	// coordinates nothing is maintaining any more.
	it("strips the position it wrote when destroyed under a still-mounted node", () => {
		const { anchorEl, node } = setup(
			{ x: 100, y: 100, width: 50, height: 20 },
			{ width: 200, height: 100 }
		);

		const handle = attachAnchorPosition(node, { anchor: () => anchorEl, side: "bottom" });
		expect(node.style.position).toBe("fixed");
		expect(node.style.top).toBe("128px");
		expect(node.style.left).toBe("25px");

		handle.destroy();

		expect(node.isConnected).toBe(true);
		expect(node.style.position).toBe("");
		expect(node.style.top).toBe("");
		expect(node.style.left).toBe("");
	});
});
