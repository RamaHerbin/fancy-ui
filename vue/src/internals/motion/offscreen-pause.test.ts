import { afterEach, describe, expect, it, vi } from "vitest";
import { offscreenPause, offscreenPauseParent } from "./offscreen-pause.js";

class MockIntersectionObserver {
	static instances: MockIntersectionObserver[] = [];
	callback: IntersectionObserverCallback;
	options?: IntersectionObserverInit;
	observe = vi.fn();
	disconnect = vi.fn();

	constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		this.callback = callback;
		this.options = options;
		MockIntersectionObserver.instances.push(this);
	}

	trigger(isIntersecting: boolean) {
		this.callback(
			[{ isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

afterEach(() => {
	MockIntersectionObserver.instances = [];
	vi.unstubAllGlobals();
});

describe("offscreenPause", () => {
	it("observes with a zero threshold and a 256px margin", () => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
		offscreenPause(document.createElement("div"));
		const io = MockIntersectionObserver.instances[0]!;
		expect(io.options?.threshold).toBe(0);
		expect(io.options?.rootMargin).toBe("256px");
	});

	it("sets the attribute when out of view and removes it when back in view", () => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
		const node = document.createElement("div");
		offscreenPause(node);
		const io = MockIntersectionObserver.instances[0]!;
		io.trigger(false);
		expect(node.hasAttribute("data-ft-offscreen")).toBe(true);
		io.trigger(true);
		expect(node.hasAttribute("data-ft-offscreen")).toBe(false);
		io.trigger(false);
		expect(node.hasAttribute("data-ft-offscreen")).toBe(true);
	});

	it("never sets the attribute without IntersectionObserver", () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const node = document.createElement("div");
		offscreenPause(node);
		expect(node.hasAttribute("data-ft-offscreen")).toBe(false);
	});

	it("disconnects and clears the attribute on destroy", () => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
		const node = document.createElement("div");
		const action = offscreenPause(node);
		const io = MockIntersectionObserver.instances[0]!;
		io.trigger(false);
		action?.destroy?.();
		expect(io.disconnect).toHaveBeenCalled();
		expect(node.hasAttribute("data-ft-offscreen")).toBe(false);
	});
});

describe("offscreenPauseParent", () => {
	it("marks the parent element, not the node itself", () => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
		const parent = document.createElement("div");
		const child = document.createElement("span");
		parent.append(child);
		offscreenPauseParent(child);
		MockIntersectionObserver.instances[0]!.trigger(false);
		expect(parent.hasAttribute("data-ft-offscreen")).toBe(true);
		expect(child.hasAttribute("data-ft-offscreen")).toBe(false);
	});

	it("does nothing for a detached node", () => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
		offscreenPauseParent(document.createElement("span"));
		expect(MockIntersectionObserver.instances).toHaveLength(0);
	});
});
