import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeIntersectionObserver } from "../../test-setup.js";
import { useOffscreenPause } from "./offscreen-pause.js";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useOffscreenPause", () => {
	it("sets the attribute when out of view and removes it when back in view", () => {
		const node = document.createElement("div");
		renderHook(() => useOffscreenPause(node));
		const io = FakeIntersectionObserver.instances.at(-1)!;
		expect(io.options?.rootMargin).toBe("256px");
		io.trigger(false);
		expect(node.hasAttribute("data-ft-offscreen")).toBe(true);
		io.trigger(true);
		expect(node.hasAttribute("data-ft-offscreen")).toBe(false);
	});

	it("never sets the attribute without IntersectionObserver", () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const node = document.createElement("div");
		renderHook(() => useOffscreenPause(node));
		expect(node.hasAttribute("data-ft-offscreen")).toBe(false);
	});

	it("does nothing for a null node", () => {
		const before = FakeIntersectionObserver.instances.length;
		renderHook(() => useOffscreenPause(null));
		expect(FakeIntersectionObserver.instances.length).toBe(before);
	});

	it("disconnects and clears the attribute on unmount", () => {
		const node = document.createElement("div");
		const { unmount } = renderHook(() => useOffscreenPause(node));
		const io = FakeIntersectionObserver.instances.at(-1)!;
		io.trigger(false);
		unmount();
		expect(io.elements.size).toBe(0);
		expect(node.hasAttribute("data-ft-offscreen")).toBe(false);
	});
});
