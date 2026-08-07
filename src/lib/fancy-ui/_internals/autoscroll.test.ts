import { afterEach, describe, it, expect, vi } from "vitest";
import { autoscroll, scrollToBottom } from "./autoscroll.js";

// jsdom has no layout, so scrollHeight/clientHeight are always 0. Patching them
// onto the instance gives the action a container that is 1000px of content in a
// 400px viewport: the bottom sits at scrollTop 600.
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

describe("autoscroll", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		vi.useRealTimers();
	});

	it("starts stuck when the container is already at the bottom, without announcing it", () => {
		const node = makeNode();
		const onStickChange = vi.fn();
		autoscroll(node, { onStickChange });
		expect(onStickChange).not.toHaveBeenCalled();
	});

	it("reports leaving and re-entering the bottom zone, once per transition", () => {
		const node = makeNode();
		const onStickChange = vi.fn();
		autoscroll(node, { onStickChange });

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
		autoscroll(node, { bottomThreshold: 5, onStickChange });

		node.scrollTop = 596; // 4px from the bottom
		node.dispatchEvent(new Event("scroll"));
		expect(onStickChange).toHaveBeenCalledExactlyOnceWith(true);
	});

	it("pins to the bottom when content grows while stuck", async () => {
		const node = makeNode();
		autoscroll(node);
		node.scrollTop = 0; // proof the pin ran, without dispatching a scroll event

		node.appendChild(document.createElement("p"));
		await settle();

		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("batches several mutations in one frame into a single pin", async () => {
		const node = makeNode();
		autoscroll(node);
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
		autoscroll(node);

		node.appendChild(document.createElement("p"));
		await settle();

		expect(node.scrollTop).toBe(100);
	});

	it("stops pinning once enabled flips to false, and resumes when it flips back", async () => {
		const node = makeNode();
		const handle = autoscroll(node, { enabled: true });

		handle.update?.({ enabled: false });
		node.scrollTop = 0;
		node.appendChild(document.createElement("p"));
		await settle();
		expect(node.scrollTop).toBe(0);

		// Back at the bottom before the action is handed back, since re-enabling
		// re-reads the container and a reader still scrolled up is left where they
		// are — which the reconnect test above is the one to prove.
		node.scrollTop = BOTTOM;
		handle.update?.({ enabled: true });
		node.scrollTop = 0; // proof the pin ran, without dispatching a scroll event
		node.appendChild(document.createElement("p"));
		await settle();
		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("re-reads the container on reconnect, in both directions", async () => {
		const node = makeNode();
		const onStickChange = vi.fn();
		const handle = autoscroll(node, { enabled: true, onStickChange });

		// Scrolled up with the listeners off: nothing told the action about it.
		handle.update?.({ enabled: false, onStickChange });
		node.scrollTop = 0;
		handle.update?.({ enabled: true, onStickChange });
		expect(onStickChange).toHaveBeenCalledExactlyOnceWith(false);

		// And back: a container that returned to its bottom edge while disconnected
		// has to be found pinned again, or nothing would ever pin it.
		handle.update?.({ enabled: false, onStickChange });
		node.scrollTop = BOTTOM;
		handle.update?.({ enabled: true, onStickChange });
		expect(onStickChange).toHaveBeenCalledTimes(2);
		expect(onStickChange).toHaveBeenLastCalledWith(true);

		// Proof the fresh answer is the one the pin acts on.
		node.scrollTop = 0;
		node.appendChild(document.createElement("p"));
		await settle();
		expect(node.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("mounting disabled and enabling later reads the container as it is then", () => {
		// Mounted at the bottom — an empty transcript always is — and only enabled
		// once a reply starts, by which time the reader has scrolled up to re-read.
		const node = makeNode();
		const onStickChange = vi.fn();
		const handle = autoscroll(node, { enabled: false, onStickChange });

		node.scrollTop = 0;
		expect(onStickChange).not.toHaveBeenCalled();

		handle.update?.({ enabled: true, onStickChange });
		expect(onStickChange).toHaveBeenCalledExactlyOnceWith(false);
	});

	it("does nothing after destroy, and destroying twice does not throw", async () => {
		const node = makeNode();
		const onStickChange = vi.fn();
		const handle = autoscroll(node, { onStickChange });

		handle.destroy?.();
		node.scrollTop = 0;
		node.appendChild(document.createElement("p"));
		await settle();
		expect(node.scrollTop).toBe(0);

		node.dispatchEvent(new Event("scroll"));
		expect(onStickChange).not.toHaveBeenCalled();
		expect(() => handle.destroy?.()).not.toThrow();
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
