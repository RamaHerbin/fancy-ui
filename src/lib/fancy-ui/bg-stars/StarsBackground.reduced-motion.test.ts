/**
 * Under `prefers-reduced-motion: reduce` the parallax spring never schedules a
 * frame (the pointer is ignored, the layer rests at the origin); the
 * no-preference control proves the loop really runs otherwise.
 */
import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import StarsBackground from "./StarsBackground.svelte";

function stubMotion(reduce: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: reduce && query.includes("reduce") && !query.includes("no-preference"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	}));
}

describe("StarsBackground reduced motion", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("schedules no animation frame under reduce", async () => {
		stubMotion(true);
		const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);
		render(StarsBackground);
		await tick();
		expect(raf).not.toHaveBeenCalled();
	});

	it("runs the spring loop with no preference (control)", async () => {
		stubMotion(false);
		const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);
		render(StarsBackground);
		await tick();
		expect(raf).toHaveBeenCalled();
	});
});
