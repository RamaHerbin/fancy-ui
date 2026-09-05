import { StrictMode } from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { attachFloat, useFloat } from "./use-float.js";
import type { FloatHandle, FloatOptions, FloatPlacement, FloatRect } from "./use-float.js";

const OFFSET = 6;
const PADDING = 8;
const VIEWPORT = { width: 1000, height: 800 };

function rect(x: number, y: number, width: number, height: number): FloatRect {
	return { x, y, width, height };
}

/*
 * The action half, transposed from float.test.ts's "float action" describe
 * block onto `attachFloat`. jsdom has no layout, so every measurement is
 * stubbed: the float's own box is patched onto the node, the anchor is a
 * virtual rect, and the viewport is pinned to VIEWPORT. Frames are captured
 * rather than run, so `position()` only advances when a test says so.
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

describe("attachFloat", () => {
	let addListener: ReturnType<typeof vi.spyOn>;
	let removeListener: ReturnType<typeof vi.spyOn>;
	let raf: ReturnType<typeof vi.spyOn>;
	let caf: ReturnType<typeof vi.spyOn>;
	let frames: FrameRequestCallback[] = [];
	let nextFrameId = 0;
	let live: FloatHandle[] = [];

	/**
	 * The action listens on `window`, which outlives the test — an instance
	 * left running would answer the next test's scroll events and inflate its
	 * frame counts. Everything mounted here is torn down in afterEach.
	 */
	function mount(options: FloatOptions, node = makeNode()) {
		const handle = attachFloat(node, options);
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
		for (const handle of live) handle.destroy();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		document.body.innerHTML = "";
	});

	/** jsdom ships no ResizeObserver; this one reports what it was handed. */
	function stubResizeObserver() {
		const observed: Element[] = [];
		let notify: () => void = () => {};
		vi.stubGlobal(
			"ResizeObserver",
			class {
				constructor(callback: () => void) {
					notify = callback;
				}
				observe(target: Element) {
					observed.push(target);
				}
				unobserve() {}
				disconnect() {
					observed.length = 0;
				}
			}
		);
		return {
			observed,
			resize: () => notify(),
		};
	}

	it("listens for scroll and resize while enabled, and lets go on destroy", () => {
		const { handle } = mount({ anchor: ANCHOR });

		expect(addListener).toHaveBeenCalledWith("scroll", expect.any(Function), {
			capture: true,
			passive: true,
		});
		expect(addListener).toHaveBeenCalledWith("resize", expect.any(Function), { passive: true });

		// A frame is in flight when destroy lands, so it has to be called off
		// too: the callback would otherwise touch a node the component has
		// torn down.
		window.dispatchEvent(new Event("scroll"));
		expect(raf).toHaveBeenCalledTimes(1);

		handle.destroy();
		expect(removeListener).toHaveBeenCalledWith("scroll", expect.any(Function), { capture: true });
		expect(removeListener).toHaveBeenCalledWith("resize", expect.any(Function));
		expect(caf).toHaveBeenCalledExactlyOnceWith(1);
	});

	it("watches the float and its anchor for size changes", () => {
		// Async results arriving in an open menu, a font swap, or an anchor
		// that grows all move the geometry without a scroll or a window
		// resize.
		const sizes = stubResizeObserver();
		const anchor = makeNode({ width: 200, height: 40 });
		const { node } = mount({ anchor });

		expect(sizes.observed).toEqual([node, anchor]);

		sizes.resize();
		expect(raf).toHaveBeenCalledTimes(1);
	});

	it("re-points the size watch at a new anchor on update", () => {
		const sizes = stubResizeObserver();
		const first = makeNode({ width: 200, height: 40 });
		const second = makeNode({ width: 300, height: 40 });
		const { node, handle } = mount({ anchor: first });

		handle.update({ anchor: second });
		expect(sizes.observed).toEqual([node, second]);
	});

	it("coalesces a burst of scroll events into a single frame", () => {
		mount({ anchor: ANCHOR });

		window.dispatchEvent(new Event("scroll"));
		window.dispatchEvent(new Event("scroll"));
		window.dispatchEvent(new Event("scroll"));
		expect(raf).toHaveBeenCalledTimes(1);

		// The guard clears once the frame runs, so the next event schedules
		// again.
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

		handle.update({ anchor: ANCHOR, matchWidth: false });
		expect(node.style.width).toBe("");
	});

	it("stops listening and strips its own styles when disabled", () => {
		const { node, handle } = mount({ anchor: ANCHOR });
		window.dispatchEvent(new Event("scroll"));

		handle.update({ anchor: ANCHOR, enabled: false });

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

	it("strips its own styles when destroyed under a still-mounted node", () => {
		const { node, handle } = mount({ anchor: ANCHOR, matchWidth: true });
		expect(node.style.position).toBe("fixed");
		expect(node.dataset.placement).toBe("bottom-start");

		handle.destroy();

		// `FloatHandle.destroy()` promises to strip the node's own styles, and
		// only a caller that keeps the node in the document can see it break
		// that promise: left fixed, sized to an anchor it no longer tracks and
		// still advertising a stale `data-placement`.
		expect(node.isConnected).toBe(true);
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

	it("reports the resolved placement only when it changes", () => {
		const onPlacement = vi.fn();
		const { handle } = mount({ anchor: ANCHOR, onPlacement } as FloatOptions & {
			onPlacement: (placement: FloatPlacement) => void;
		});

		expect(onPlacement).toHaveBeenCalledExactlyOnceWith("bottom-start");

		// Same placement again: no redundant report.
		handle.update({ anchor: ANCHOR, onPlacement } as FloatOptions & {
			onPlacement: (placement: FloatPlacement) => void;
		});
		expect(onPlacement).toHaveBeenCalledOnce();

		// An anchor near the bottom of the viewport flips the placement.
		const flipping = rect(100, 750, 200, 40);
		handle.update({ anchor: flipping, onPlacement } as FloatOptions & {
			onPlacement: (placement: FloatPlacement) => void;
		});
		expect(onPlacement).toHaveBeenCalledTimes(2);
		expect(onPlacement).toHaveBeenLastCalledWith("top-start");
	});
});

/*
 * Hook layer. `useFloat` wraps `attachFloat` in a layout effect and returns
 * the resolved placement instead of a callback.
 */

describe("useFloat", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
	});

	it("positions the node on mount and returns the requested placement", () => {
		const node = makeNode();
		const { result } = renderHook(() =>
			useFloat(node, { anchor: ANCHOR, placement: "bottom-start" })
		);

		expect(node.style.position).toBe("fixed");
		expect(result.current.placement).toBe("bottom-start");
	});

	it("seeds the placement from the requested side, not a hardcoded default", () => {
		// An anchor with plenty of room below: "bottom-end" holds unflipped, so
		// the seed the hook renders with matches the first real result too.
		const node = makeNode();
		const { result } = renderHook(() =>
			useFloat(node, { anchor: ANCHOR, placement: "bottom-end" })
		);

		expect(result.current.placement).toBe("bottom-end");
	});

	it("updates the resolved placement when a flip occurs on re-render", () => {
		const node = makeNode();
		let anchor = ANCHOR;
		const { result, rerender } = renderHook(
			({ anchor: a }: { anchor: FloatRect }) =>
				useFloat(node, { anchor: a, placement: "bottom-start" }),
			{ initialProps: { anchor } }
		);
		expect(result.current.placement).toBe("bottom-start");

		anchor = rect(100, 750, 200, 40);
		rerender({ anchor });
		expect(result.current.placement).toBe("top-start");
	});

	it("does nothing while node is null, and picks up positioning once it appears", () => {
		const { result, rerender } = renderHook(
			({ node }: { node: HTMLElement | null }) => useFloat(node, { anchor: ANCHOR }),
			{ initialProps: { node: null as HTMLElement | null } }
		);
		expect(result.current.placement).toBe("bottom-start");

		const node = makeNode();
		rerender({ node });
		expect(node.style.position).toBe("fixed");
	});

	it("tears down its listeners on unmount", () => {
		const node = makeNode();
		const removeListener = vi.spyOn(window, "removeEventListener");
		const { unmount } = renderHook(() => useFloat(node, { anchor: ANCHOR }));

		unmount();
		expect(removeListener).toHaveBeenCalledWith("scroll", expect.any(Function), { capture: true });
		removeListener.mockRestore();
	});

	/*
	 * The mandated per-hook StrictMode rehearsal: mount, cleanup, mount again,
	 * with nothing left over. The hazards here are a second capturing scroll
	 * listener on `window` — which outlives the component and would answer for
	 * a torn-down float — and a second ResizeObserver holding the node.
	 */
	it("returns its window listeners and its observer to rest after a StrictMode rehearsal", () => {
		// Counted by TARGETS, not by construction: the action re-observes on
		// every sync and calls `disconnect()` first, so an instance goes empty
		// and fills again in normal operation. What must never survive a
		// cleanup is an observer still holding the node.
		const instances: Set<Element>[] = [];
		const watching = () => instances.filter((targets) => targets.size > 0).length;
		vi.stubGlobal(
			"ResizeObserver",
			class {
				#targets = new Set<Element>();
				constructor() {
					instances.push(this.#targets);
				}
				observe(target: Element) {
					this.#targets.add(target);
				}
				unobserve(target: Element) {
					this.#targets.delete(target);
				}
				disconnect() {
					this.#targets.clear();
				}
			}
		);

		const node = makeNode();
		const addListener = vi.spyOn(window, "addEventListener");
		const removeListener = vi.spyOn(window, "removeEventListener");
		/** Listeners of one type currently attached, net of every add and remove. */
		const live = (type: "scroll" | "resize") =>
			addListener.mock.calls.filter(([t]) => t === type).length -
			removeListener.mock.calls.filter(([t]) => t === type).length;

		const { unmount } = renderHook(() => useFloat(node, { anchor: ANCHOR }), {
			wrapper: StrictMode,
		});

		expect(instances.length).toBeGreaterThan(1); // the double-invoke happened
		expect(watching()).toBe(1);
		// The count a single mount leaves, not two of each: a surviving
		// capturing scroll listener outlives the component and would keep
		// scheduling frames for a float nothing owns any more.
		expect(live("scroll")).toBe(1);
		expect(live("resize")).toBe(1);

		unmount();

		// Back to the pre-mount baseline.
		expect(live("scroll")).toBe(0);
		expect(live("resize")).toBe(0);
		expect(watching()).toBe(0);

		addListener.mockRestore();
		removeListener.mockRestore();
	});
});
