/**
 * Under `prefers-reduced-motion: reduce` the grid paints one still frame when it
 * scrolls into view and never schedules a second animation frame; the
 * no-preference control proves the loop really runs otherwise.
 */
import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import FlickeringGrid from "./FlickeringGrid.svelte";

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

/** Observers that report "in view" as soon as they observe. */
function stubObservers() {
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			constructor(private cb: (entries: { isIntersecting: boolean }[]) => void) {}
			observe() {
				this.cb([{ isIntersecting: true }]);
			}
			unobserve() {}
			disconnect() {}
		}
	);
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	);
}

function stubCanvas() {
	const ctx = {
		fillStyle: "",
		scale: () => {},
		clearRect: () => {},
		fillRect: () => {},
		setTransform: () => {},
		drawImage: () => {},
	};
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
}

/** rAF that queues callbacks so the test drives each frame by hand. */
function queueFrames() {
	const queue: FrameRequestCallback[] = [];
	const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
		queue.push(cb);
		return queue.length;
	});
	const flush = () => {
		for (const cb of queue.splice(0)) cb(performance.now());
	};
	return { raf, flush };
}

describe("FlickeringGrid reduced motion", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("paints one frame and schedules no further frame under reduce", async () => {
		stubMotion(true);
		stubObservers();
		stubCanvas();
		const { raf, flush } = queueFrames();
		render(FlickeringGrid);
		await tick();
		flush();
		expect(raf).toHaveBeenCalledTimes(1);
	});

	it("keeps looping with no preference (control)", async () => {
		stubMotion(false);
		stubObservers();
		stubCanvas();
		const { raf, flush } = queueFrames();
		render(FlickeringGrid);
		await tick();
		flush();
		expect(raf.mock.calls.length).toBeGreaterThan(1);
	});
});
