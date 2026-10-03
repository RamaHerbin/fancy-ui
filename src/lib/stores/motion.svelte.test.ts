import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "fancy-ui-motion";

function mockReducedMotion(matches: boolean) {
	vi.spyOn(window, "matchMedia").mockImplementation(
		(query: string) =>
			({
				matches: query.includes("reduce") ? matches : false,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
				addListener: () => {},
				removeListener: () => {},
			}) as MediaQueryList
	);
}

async function load() {
	vi.resetModules();
	return await import("./motion.svelte.js");
}

describe("motion store", () => {
	beforeEach(() => {
		localStorage.clear();
		delete document.documentElement.dataset.motion;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("toggles data-motion on <html> and persists the choice", async () => {
		const store = await load();
		const state = store.createMotionState();
		expect(state.paused).toBe(false);
		state.toggle();
		expect(document.documentElement.dataset.motion).toBe("paused");
		expect(localStorage.getItem(KEY)).toBe("paused");
		expect(state.userPaused).toBe(true);
		state.toggle();
		expect(document.documentElement.dataset.motion).toBeUndefined();
		expect(localStorage.getItem(KEY)).toBe("auto");
	});

	it("restores a stored pause on import", async () => {
		localStorage.setItem(KEY, "paused");
		const store = await load();
		expect(store.createMotionState().paused).toBe(true);
		expect(document.documentElement.dataset.motion).toBe("paused");
	});

	it("reports paused under OS reduced motion without touching the attribute", async () => {
		mockReducedMotion(true);
		const store = await load();
		const state = store.createMotionState();
		expect(state.reducedMotion).toBe(true);
		expect(state.userPaused).toBe(false);
		expect(state.paused).toBe(true);
		expect(document.documentElement.dataset.motion).toBeUndefined();
	});
});
