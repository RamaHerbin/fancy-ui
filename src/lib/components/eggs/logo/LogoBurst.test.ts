import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import LogoBurst from "./LogoBurst.svelte";
import def from "./index.js";
import type { EggContext } from "../types.js";

function fakeCtx(reducedMotion: boolean): EggContext {
	return {
		id: "logo",
		reducedMotion,
		dismiss: vi.fn(),
		found: vi.fn(),
		trigger: vi.fn(() => Promise.resolve()),
	};
}

describe("logo egg", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("is a 7-click dom trigger on the brand links", () => {
		expect(def.trigger).toEqual({
			kind: "dom",
			event: "click",
			selector: "[data-egg='logo']",
			count: 7,
			windowMs: 3000,
		});
		expect(def.autoDismissMs).toBe(2200);
	});

	it("loads the burst payload lazily", async () => {
		vi.useRealTimers();
		const mod = await def.load!();
		expect(mod.default).toBe(LogoBurst);
	});

	it("shows the caption and chains into party mode after 1500 ms", () => {
		const ctx = fakeCtx(false);
		const { getByText } = render(LogoBurst, { props: { ctx } });
		expect(getByText(/You found the spark\./)).toBeTruthy();
		vi.advanceTimersByTime(1499);
		expect(ctx.trigger).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(ctx.trigger).toHaveBeenCalledTimes(1);
		expect(ctx.trigger).toHaveBeenCalledWith("cheatcode");
	});

	it("never chains under reduced motion and skips the particles", () => {
		const ctx = fakeCtx(true);
		const { getByText, container } = render(LogoBurst, { props: { ctx } });
		expect(getByText(/You found the spark\./)).toBeTruthy();
		expect(container.querySelector("canvas")).toBeNull();
		vi.advanceTimersByTime(5000);
		expect(ctx.trigger).not.toHaveBeenCalled();
	});

	it("clears its timer when unmounted early", () => {
		const ctx = fakeCtx(false);
		const { unmount } = render(LogoBurst, { props: { ctx } });
		unmount();
		vi.advanceTimersByTime(5000);
		expect(ctx.trigger).not.toHaveBeenCalled();
	});
});
