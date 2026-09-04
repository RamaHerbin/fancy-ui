import { afterEach, describe, it, expect, vi } from "vitest";
import { StrictMode } from "react";
import { renderHook, cleanup, act } from "@testing-library/react";
import { attachAutoscroll, scrollToBottom, useAutoscroll } from "./use-autoscroll.js";

// jsdom has no layout, so scrollHeight/clientHeight are always 0. Patching
// them onto the instance gives the action a container that is 1000px of
// content in a 400px viewport: the bottom sits at scrollTop 600.
const SCROLL_HEIGHT = 1000;
const CLIENT_HEIGHT = 400;
const BOTTOM = SCROLL_HEIGHT - CLIENT_HEIGHT;

function makeNode(scrollTop = BOTTOM): HTMLElement {
	const node = document.createElement("div");
	Object.defineProperty(node, "scrollHeight", { value: SCROLL_HEIGHT, configurable: true });
	Object.defineProperty(node, "clientHeight", { value: CLIENT_HEIGHT, configurable: true });
	Object.defineProperty(node, "scrollTop", {
		value: scrollTop,
		writable: true,
		configurable: true,
	});
	document.body.appendChild(node);
	return node;
}

/** Let the MutationObserver callback land. */
function deliverMutations(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Let the MutationObserver callback land, then wait out the action's rAF. */
async function settle(): Promise<void> {
	await deliverMutations();
	await new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * jsdom ships no ResizeObserver; this one reports what it was handed.
 *
 * `live` counts the observers that have been constructed and not yet
 * disconnected, which is the only number that shows a doubled attach:
 * `observed` is a Set shared by every instance, so two observers watching the
 * same node still read as one entry, and one instance's `disconnect()` would
 * clear the other's rows out from under it.
 */
function stubResizeObserver() {
	const observed = new Set<Element>();
	let notify: () => void = () => {};
	const state = { live: 0, constructed: 0, observeCalls: 0 };
	vi.stubGlobal(
		"ResizeObserver",
		class {
			#connected = true;
			constructor(callback: () => void) {
				notify = callback;
				state.live += 1;
				state.constructed += 1;
			}
			observe(target: Element) {
				state.observeCalls += 1;
				observed.add(target);
			}
			unobserve(target: Element) {
				observed.delete(target);
			}
			disconnect() {
				observed.clear();
				if (this.#connected) {
					this.#connected = false;
					state.live -= 1;
				}
			}
		}
	);
	return { observed, state, resize: () => notify() };
}

describe("attachAutoscroll", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("starts stuck when the container is already at the bottom, without announcing it", () => {
		const node = makeNode();
		const onStickChange = vi.fn();
		attachAutoscroll(node, { onStickChange });
		expect(onStickChange).not.toHaveBeenCalled();
	});

	it("reports leaving and re-entering the bottom zone, once per transition", () => {
		const node = makeNode();
		const onStickChange = vi.fn();
		attachAutoscroll(node, { onStickChange });

		// Scrolled well up: 500px from the bottom.
		node.scrollTop = 100;
		node.dispatchEvent(new Event("scroll"));
		expect(onStickChange).toHaveBeenCalledTimes(1);
		expect(onStickChange).toHaveBeenLastCalledWith(false);

		// Still away from the bottom (100px) — no second callback.
		node.scrollTop = 500;
		node.dispatchEvent(new Event("scroll"));
		expect(onStickChange).toHaveBeenCalledTimes(1);

		// Back inside the 40px threshold.
		node.scrollTop = 560;
		node.dispatchEvent(new Event("scroll"));
		expect(onStickChange).toHaveBeenCalledTimes(2);
		expect(onStickChange).toHaveBeenLastCalledWith(true);

		// Fully at the bottom is still stuck — no redundant callback.
		node.scrollTop = BOTTOM;
		node.dispatchEvent(new Event("scroll"));
		expect(onStickChange).toHaveBeenCalledTimes(2);
	});

	it("honours a custom bottomThreshold", () => {
		const node = makeNode(590); // 10px from the bottom
		const onStickChange = vi.fn();
		attachAutoscroll(node, { bottomThreshold: 5, onStickChange });

		node.scrollTop = 596; // 4px from the bottom
		node.dispatchEvent(new Event("scroll"));
		expect(onStickChange).toHaveBeenCalledExactlyOnceWith(true);
	});

	it("pins to the bottom when content grows while stuck", async () => {
		const node = makeNode();
		attachAutoscroll(node);
		node.scrollTop = 0; // proof the pin ran, without dispatching a scroll event

		node.appendChild(document.createElement("p"));
		await settle();

		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("batches several mutations in one frame into a single pin", async () => {
		const node = makeNode();
		attachAutoscroll(node);
		const raf = vi.spyOn(globalThis, "requestAnimationFrame");

		node.appendChild(document.createElement("p"));
		node.appendChild(document.createElement("p"));
		node.textContent = "streamed";
		await deliverMutations();

		expect(raf).toHaveBeenCalledTimes(1);
		raf.mockRestore();

		await new Promise((resolve) => requestAnimationFrame(resolve));
		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("leaves the scroll position alone when content grows while not stuck", async () => {
		const node = makeNode(100);
		attachAutoscroll(node);

		node.appendChild(document.createElement("p"));
		await settle();

		expect(node.scrollTop).toBe(100);
	});

	it("stops pinning once enabled flips to false, and resumes when it flips back", async () => {
		const node = makeNode();
		const handle = attachAutoscroll(node, { enabled: true });

		handle.update({ enabled: false });
		node.scrollTop = 0;
		node.appendChild(document.createElement("p"));
		await settle();
		expect(node.scrollTop).toBe(0);

		handle.update({ enabled: true });
		node.appendChild(document.createElement("p"));
		await settle();
		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("pinOnConnect starts pinned and jumps to the bottom, whatever the container says", async () => {
		// A trace joined mid-stream mounts full of content at scrollTop 0,
		// which otherwise reads as a reader who scrolled up.
		const node = makeNode(0);
		attachAutoscroll(node, { pinOnConnect: true });
		expect(node.scrollTop).toBe(SCROLL_HEIGHT);

		node.scrollTop = 0; // proof the pin ran, without dispatching a scroll event
		node.appendChild(document.createElement("p"));
		await settle();
		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("re-sticks when content reaches the bottom edge with no scroll event", async () => {
		const node = makeNode(100);
		const onStickChange = vi.fn();
		attachAutoscroll(node, { onStickChange });

		// A row was removed: same scrollTop, but the bottom edge came to meet
		// it.
		Object.defineProperty(node, "scrollHeight", { value: 500, configurable: true });
		node.appendChild(document.createElement("p"));
		await deliverMutations();

		expect(onStickChange).toHaveBeenCalledExactlyOnceWith(true);
	});

	it("does not release a pinned container just because content grew below it", async () => {
		const node = makeNode();
		const onStickChange = vi.fn();
		attachAutoscroll(node, { onStickChange });

		// Growth puts fresh content below the viewport for a frame; unsticking
		// here would cancel the pin that is about to run.
		Object.defineProperty(node, "scrollHeight", { value: 2000, configurable: true });
		node.appendChild(document.createElement("p"));
		await settle();

		expect(onStickChange).not.toHaveBeenCalled();
		expect(node.scrollTop).toBe(2000);
	});

	it("re-reads the pin state when the threshold changes mid-flight", () => {
		const node = makeNode(590); // 10px from the bottom
		const onStickChange = vi.fn();
		const handle = attachAutoscroll(node, { bottomThreshold: 5, onStickChange });

		handle.update({ bottomThreshold: 50, onStickChange });
		expect(onStickChange).toHaveBeenCalledExactlyOnceWith(true);

		handle.update({ bottomThreshold: 5, onStickChange });
		expect(onStickChange).toHaveBeenLastCalledWith(false);
	});

	it("pins when a row grows without touching the child list", async () => {
		// An image finishing its download, a web font swapping in, a row
		// expanding under CSS: the container has a fixed height, so only the
		// row resizes.
		const sizes = stubResizeObserver();
		const node = makeNode();
		const row = document.createElement("p");
		node.appendChild(row);

		attachAutoscroll(node);
		expect(sizes.observed.has(node)).toBe(true);
		expect(sizes.observed.has(row)).toBe(true);

		node.scrollTop = 0; // proof the pin ran, without dispatching a scroll event
		sizes.resize();
		await new Promise((resolve) => requestAnimationFrame(resolve));
		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("follows rows in and out of the transcript", async () => {
		const sizes = stubResizeObserver();
		const node = makeNode();
		attachAutoscroll(node);

		const row = document.createElement("p");
		node.appendChild(row);
		await deliverMutations();
		expect(sizes.observed.has(row)).toBe(true);

		// Left observed, a removed row would keep the transcript alive in
		// memory.
		row.remove();
		await deliverMutations();
		expect(sizes.observed.has(row)).toBe(false);
	});

	it("does nothing after destroy, and destroying twice does not throw", async () => {
		const node = makeNode();
		const onStickChange = vi.fn();
		const handle = attachAutoscroll(node, { onStickChange });

		handle.destroy();
		node.scrollTop = 0;
		node.appendChild(document.createElement("p"));
		await settle();
		expect(node.scrollTop).toBe(0);

		node.dispatchEvent(new Event("scroll"));
		expect(onStickChange).not.toHaveBeenCalled();
		expect(() => handle.destroy()).not.toThrow();
	});

	it("scrollToBottom falls back to scrollTop when scrollTo is unavailable", () => {
		const node = makeNode(0);
		expect(typeof node.scrollTo).not.toBe("function"); // jsdom has no Element.scrollTo
		scrollToBottom(node);
		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("scrollToBottom prefers scrollTo, smooth unless told otherwise", () => {
		const node = makeNode(0);
		const scrollTo = vi.fn();
		Object.defineProperty(node, "scrollTo", { value: scrollTo, configurable: true });

		scrollToBottom(node);
		expect(scrollTo).toHaveBeenLastCalledWith({ top: SCROLL_HEIGHT, behavior: "smooth" });

		scrollToBottom(node, "instant");
		expect(scrollTo).toHaveBeenLastCalledWith({ top: SCROLL_HEIGHT, behavior: "instant" });
		expect(node.scrollTop).toBe(0);
	});
});

/*
 * Hook layer. `useAutoscroll` mounts/destroys the core in a layout effect so
 * `pinOnConnect`'s jump lands before paint, and re-syncs on option changes.
 */

describe("useAutoscroll", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
	});

	it("pins on mount before paint when pinOnConnect is set", () => {
		const node = makeNode(0);
		renderHook(() => useAutoscroll(node, { pinOnConnect: true }));

		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("does nothing while node is null", () => {
		const { rerender } = renderHook(
			({ node }: { node: HTMLElement | null }) => useAutoscroll(node, { pinOnConnect: true }),
			{ initialProps: { node: null as HTMLElement | null } }
		);

		const node = makeNode(0);
		rerender({ node });
		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("forwards onStickChange through a live callback", () => {
		const node = makeNode();
		const onStickChange = vi.fn();
		const { rerender } = renderHook(
			({ cb }: { cb: (stuck: boolean) => void }) => useAutoscroll(node, { onStickChange: cb }),
			{ initialProps: { cb: onStickChange } }
		);

		node.scrollTop = 100;
		act(() => {
			node.dispatchEvent(new Event("scroll"));
		});
		expect(onStickChange).toHaveBeenCalledExactlyOnceWith(false);

		// A fresh inline callback identity (the common call-site shape) still
		// reaches the listener already attached.
		const second = vi.fn();
		rerender({ cb: second });
		node.scrollTop = BOTTOM;
		act(() => {
			node.dispatchEvent(new Event("scroll"));
		});
		expect(second).toHaveBeenCalledExactlyOnceWith(true);
	});

	it("re-syncs bottomThreshold on re-render", () => {
		const node = makeNode(590); // 10px from the bottom
		const onStickChange = vi.fn();
		const { rerender } = renderHook(
			({ threshold }: { threshold: number }) =>
				useAutoscroll(node, { bottomThreshold: threshold, onStickChange }),
			{ initialProps: { threshold: 5 } }
		);

		rerender({ threshold: 50 });
		expect(onStickChange).toHaveBeenCalledExactlyOnceWith(true);
	});

	it("disconnects when enabled flips to false", async () => {
		const node = makeNode();
		const { rerender } = renderHook(
			({ enabled }: { enabled: boolean }) => useAutoscroll(node, { enabled }),
			{ initialProps: { enabled: true } }
		);

		rerender({ enabled: false });
		node.scrollTop = 0;
		node.appendChild(document.createElement("p"));
		await settle();
		expect(node.scrollTop).toBe(0);
	});

	it("tears down its listeners on unmount", () => {
		const node = makeNode();
		const onStickChange = vi.fn();
		const { unmount } = renderHook(() => useAutoscroll(node, { onStickChange }));

		unmount();
		node.scrollTop = 100;
		node.dispatchEvent(new Event("scroll"));
		expect(onStickChange).not.toHaveBeenCalled();
	});

	/*
	 * The mandated per-hook StrictMode rehearsal. This is the one hook in this
	 * unit that attaches three things at once — a scroll listener, a
	 * MutationObserver and a ResizeObserver — so a mount/cleanup/mount that
	 * left any of them behind would double every stick report and keep a
	 * detached transcript observed for the life of the page.
	 */
	it("returns its observers and listeners to rest after a StrictMode rehearsal", async () => {
		const sizes = stubResizeObserver();
		const node = makeNode();
		const row = document.createElement("p");
		node.appendChild(row);

		const onStickChange = vi.fn();
		// This hook listens on the NODE, never on `window` — both are counted,
		// so the assertion says which one it uses as well as that it balances.
		const addNode = vi.spyOn(node, "addEventListener");
		const removeNode = vi.spyOn(node, "removeEventListener");
		const addWindow = vi.spyOn(window, "addEventListener");
		const removeWindow = vi.spyOn(window, "removeEventListener");
		/** Listeners of one type currently attached, net of every add and remove. */
		const live = (add: typeof addNode, remove: typeof removeNode, type: "scroll" | "resize") =>
			add.mock.calls.filter(([t]) => t === type).length -
			remove.mock.calls.filter(([t]) => t === type).length;

		const { unmount } = renderHook(() => useAutoscroll(node, { onStickChange }), {
			wrapper: StrictMode,
		});

		// One scroll listener on the node, not two, and nothing on `window`.
		expect(live(addNode, removeNode, "scroll")).toBe(1);
		expect(live(addWindow, removeWindow, "scroll")).toBe(0);
		expect(live(addWindow, removeWindow, "resize")).toBe(0);

		// One live observer watching the node and its one row, not two of each.
		expect(sizes.state.constructed).toBeGreaterThan(1); // the double-invoke happened
		expect(sizes.state.live).toBe(1);
		expect(sizes.observed.size).toBe(2);
		expect([...sizes.observed]).toEqual([node, row]);

		// One call per flip. A surviving second scroll listener answers twice.
		node.scrollTop = 100;
		act(() => {
			node.dispatchEvent(new Event("scroll"));
		});
		expect(onStickChange).toHaveBeenCalledExactlyOnceWith(false);

		node.scrollTop = BOTTOM;
		act(() => {
			node.dispatchEvent(new Event("scroll"));
		});
		expect(onStickChange).toHaveBeenCalledTimes(2);
		expect(onStickChange).toHaveBeenLastCalledWith(true);

		// One MutationObserver, too: a second would run the row sweep again and
		// hand the same appended row to the resize observer twice.
		const observeCallsBefore = sizes.state.observeCalls;
		node.appendChild(document.createElement("p"));
		await settle();
		expect(sizes.state.observeCalls - observeCallsBefore).toBe(1);

		unmount();

		// Back to the pre-mount baseline on every channel.
		expect(live(addNode, removeNode, "scroll")).toBe(0);
		expect(live(addWindow, removeWindow, "scroll")).toBe(0);
		expect(live(addWindow, removeWindow, "resize")).toBe(0);
		expect(sizes.state.live).toBe(0);
		expect(sizes.observed.size).toBe(0);

		onStickChange.mockClear();
		node.scrollTop = 100;
		node.dispatchEvent(new Event("scroll"));
		expect(onStickChange).not.toHaveBeenCalled();

		addNode.mockRestore();
		removeNode.mockRestore();
		addWindow.mockRestore();
		removeWindow.mockRestore();
	});
});
