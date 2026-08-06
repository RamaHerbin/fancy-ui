import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { ActionReturn } from "svelte/action";
import {
	computeFloatPosition,
	float,
	type FloatOptions,
	type FloatPlacement,
	type FloatRect,
} from "./float.js";

const OFFSET = 6;
const PADDING = 8;
const VIEWPORT = { width: 1000, height: 800 };

function rect(x: number, y: number, width: number, height: number): FloatRect {
	return { x, y, width, height };
}

function place(
	anchor: FloatRect,
	float: { width: number; height: number },
	placement: FloatPlacement,
	viewport = VIEWPORT
) {
	return computeFloatPosition(anchor, float, viewport, {
		placement,
		offset: OFFSET,
		padding: PADDING,
	});
}

describe("computeFloatPosition", () => {
	it("places below with left edges aligned for bottom-start", () => {
		const result = place(rect(100, 100, 200, 40), { width: 200, height: 120 }, "bottom-start");
		expect(result).toEqual({ top: 146, left: 100, placement: "bottom-start" });
	});

	it("flips bottom to top when the bottom is short and the top is roomier", () => {
		const result = place(rect(100, 700, 200, 40), { width: 200, height: 120 }, "bottom-start");
		expect(result.placement).toBe("top-start");
		expect(result.top).toBe(574);
	});

	it("keeps the requested side when neither fits but the requested side is larger", () => {
		// roomAbove 186 vs roomBelow 46: both too small for a 220px float, so the
		// larger side wins and the float overflows where it hides the least.
		const viewport = { width: 1000, height: 300 };
		const result = place(rect(100, 200, 200, 40), { width: 200, height: 220 }, "top", viewport);
		expect(result.placement).toBe("top");
	});

	it("clamps top to the padding when the float overflows above", () => {
		const viewport = { width: 1000, height: 300 };
		const result = place(rect(100, 200, 200, 40), { width: 200, height: 220 }, "top", viewport);
		expect(result.top).toBe(PADDING);
	});

	it("clamps left to the padding against the leading edge", () => {
		const result = place(rect(0, 100, 120, 40), { width: 200, height: 100 }, "bottom-start");
		expect(result.left).toBe(PADDING);
	});

	it("clamps left against the trailing edge when the float is wider than the room left", () => {
		const result = place(rect(900, 100, 100, 40), { width: 300, height: 100 }, "bottom-start");
		expect(result.left).toBe(VIEWPORT.width - 300 - PADDING);
	});

	it("aligns right edges for -end placements", () => {
		const result = place(rect(400, 100, 200, 40), { width: 120, height: 100 }, "bottom-end");
		expect(result.left).toBe(480);
		expect(result.placement).toBe("bottom-end");
	});

	it("centers the float for a bare side and keeps the bare placement", () => {
		const result = place(rect(400, 300, 200, 40), { width: 100, height: 80 }, "top");
		expect(result).toEqual({ top: 214, left: 450, placement: "top" });
	});

	it("positions against a zero-width virtual rect (caret anchoring)", () => {
		const result = place(rect(250, 300, 0, 18), { width: 180, height: 90 }, "bottom-start");
		expect(result).toEqual({ top: 324, left: 250, placement: "bottom-start" });
	});

	it("centers a zero-width virtual rect on the caret itself", () => {
		const result = place(rect(250, 300, 0, 18), { width: 180, height: 90 }, "bottom");
		expect(result.left).toBe(160);
	});
});

/*
 * The action half. jsdom has no layout, so every measurement the action takes is
 * stubbed: the float's own box is patched onto the node, the anchor is a virtual
 * rect, and the viewport is pinned to VIEWPORT. Frames are captured rather than
 * run, so `position()` only advances when a test says so.
 */

const FLOAT_BOX = { width: 200, height: 120 };
/** Anchor that leaves room on both sides: no flip, no clamping. */
const ANCHOR = rect(100, 100, 200, 40);

function makeNode(box = FLOAT_BOX): HTMLElement {
	const node = document.createElement("div");
	node.getBoundingClientRect = () =>
		({
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: box.width,
			bottom: box.height,
			width: box.width,
			height: box.height,
			toJSON: () => ({}),
		}) as DOMRect;
	document.body.appendChild(node);
	return node;
}

describe("float action", () => {
	let addListener: ReturnType<typeof vi.spyOn>;
	let removeListener: ReturnType<typeof vi.spyOn>;
	let raf: ReturnType<typeof vi.spyOn>;
	let caf: ReturnType<typeof vi.spyOn>;
	let frames: FrameRequestCallback[] = [];
	let nextFrameId = 0;
	let live: ActionReturn<FloatOptions>[] = [];

	/**
	 * The action listens on `window`, which outlives the test — an instance left
	 * running would answer the next test's scroll events and inflate its frame
	 * counts. Everything mounted here is torn down in afterEach.
	 */
	function mount(options: FloatOptions, node = makeNode()) {
		const handle = float(node, options);
		live.push(handle);
		return { node, handle };
	}

	/** Run every frame the action has asked for, then forget them. */
	function runFrames() {
		const pending = frames;
		frames = [];
		for (const frame of pending) frame(performance.now());
	}

	beforeEach(() => {
		frames = [];
		nextFrameId = 0;
		live = [];
		Object.defineProperty(window, "innerWidth", { value: VIEWPORT.width, configurable: true });
		Object.defineProperty(window, "innerHeight", { value: VIEWPORT.height, configurable: true });
		addListener = vi.spyOn(window, "addEventListener");
		removeListener = vi.spyOn(window, "removeEventListener");
		raf = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
			frames.push(cb);
			return ++nextFrameId;
		});
		caf = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
	});

	afterEach(() => {
		for (const handle of live) handle.destroy?.();
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	it("listens for scroll and resize while enabled, and lets go on destroy", () => {
		const { handle } = mount({ anchor: ANCHOR });

		expect(addListener).toHaveBeenCalledWith("scroll", expect.any(Function), {
			capture: true,
			passive: true,
		});
		expect(addListener).toHaveBeenCalledWith("resize", expect.any(Function), { passive: true });

		// A frame is in flight when destroy lands, so it has to be called off too:
		// the callback would otherwise touch a node the component has torn down.
		window.dispatchEvent(new Event("scroll"));
		expect(raf).toHaveBeenCalledTimes(1);

		handle.destroy?.();
		expect(removeListener).toHaveBeenCalledWith("scroll", expect.any(Function), { capture: true });
		expect(removeListener).toHaveBeenCalledWith("resize", expect.any(Function));
		expect(caf).toHaveBeenCalledExactlyOnceWith(1);
	});

	it("coalesces a burst of scroll events into a single frame", () => {
		mount({ anchor: ANCHOR });

		window.dispatchEvent(new Event("scroll"));
		window.dispatchEvent(new Event("scroll"));
		window.dispatchEvent(new Event("scroll"));
		expect(raf).toHaveBeenCalledTimes(1);

		// The guard clears once the frame runs, so the next event schedules again.
		runFrames();
		window.dispatchEvent(new Event("scroll"));
		expect(raf).toHaveBeenCalledTimes(2);
	});

	it("writes position, size and placement onto the node", () => {
		const { node } = mount({ anchor: ANCHOR, matchWidth: true });

		expect(node.style.position).toBe("fixed");
		expect(node.style.top).toBe("146px"); // 100 + 40 + OFFSET
		expect(node.style.left).toBe("100px"); // bottom-start aligns leading edges
		expect(node.style.width).toBe("200px");
		expect(node.dataset.placement).toBe("bottom-start");
	});

	it("clears the forced width when matchWidth is turned off", () => {
		const { node, handle } = mount({ anchor: ANCHOR, matchWidth: true });
		expect(node.style.width).toBe("200px");

		handle.update?.({ anchor: ANCHOR, matchWidth: false });
		expect(node.style.width).toBe("");
	});

	it("stops listening and strips its own styles when disabled", () => {
		const { node, handle } = mount({ anchor: ANCHOR });
		window.dispatchEvent(new Event("scroll"));

		handle.update?.({ anchor: ANCHOR, enabled: false });

		expect(removeListener).toHaveBeenCalledWith("scroll", expect.any(Function), { capture: true });
		expect(removeListener).toHaveBeenCalledWith("resize", expect.any(Function));
		expect(caf).toHaveBeenCalledExactlyOnceWith(1);
		expect(node.style.position).toBe("");
		expect(node.style.top).toBe("");
		expect(node.style.left).toBe("");
		expect(node.style.width).toBe("");
		expect(node.style.visibility).toBe("");
		expect(node.hasAttribute("data-placement")).toBe(false);
	});

	it("hides the float while its anchor getter has nothing to point at", () => {
		let current: FloatRect | null = null;
		const { node } = mount({ anchor: () => current });

		expect(node.style.visibility).toBe("hidden");
		expect(node.style.top).toBe("");

		// The caret comes back: the next frame un-hides and places the float.
		current = ANCHOR;
		window.dispatchEvent(new Event("scroll"));
		runFrames();

		expect(node.style.visibility).toBe("");
		expect(node.style.top).toBe("146px");
		expect(node.dataset.placement).toBe("bottom-start");
	});
});
