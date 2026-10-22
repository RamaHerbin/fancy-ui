import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "fancy-ui-eggs";

async function load() {
	vi.resetModules();
	return await import("./discovery.svelte.js");
}

describe("eggs discovery store", () => {
	beforeEach(() => localStorage.clear());
	afterEach(() => vi.restoreAllMocks());

	it("parses defensively", async () => {
		const { parseEggsPayload } = await load();
		const valid = ["console", "matrix"];
		expect(parseEggsPayload(null, valid)).toEqual([]);
		expect(parseEggsPayload("{nope", valid)).toEqual([]);
		expect(parseEggsPayload(JSON.stringify(["console"]), valid)).toEqual([]);
		expect(parseEggsPayload(JSON.stringify({ v: 2, found: ["console"] }), valid)).toEqual([]);
		expect(
			parseEggsPayload(
				JSON.stringify({ v: 1, found: ["console", "bogus", 3, "console", "matrix"] }),
				valid
			)
		).toEqual(["console", "matrix"]);
	});

	it("marks, persists the versioned shape and resets", async () => {
		const store = await load();
		expect(store.isFound("console")).toBe(false);
		store.markFound("console");
		store.markFound("console");
		store.markFound("matrix");
		expect(store.isFound("console")).toBe(true);
		expect([...store.getFound()]).toEqual(["console", "matrix"]);
		expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
			v: 1,
			found: ["console", "matrix"],
		});
		store.resetEggs();
		expect(store.getFound().size).toBe(0);
		expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ v: 1, found: [] });
	});

	it("reads the stored payload on first access and drops unknown ids", async () => {
		localStorage.setItem(KEY, JSON.stringify({ v: 1, found: ["retro", "gone"] }));
		const store = await load();
		expect([...store.getFound()]).toEqual(["retro"]);
	});

	it("counts only countable ids and follows other tabs", async () => {
		const store = await load();
		const state = store.createEggsState(7, ["console", "matrix"]);
		store.markFound("humans");
		store.markFound("console");
		expect(state.count).toBe(1);
		expect(state.total).toBe(7);
		expect(state.found.has("humans")).toBe(true);
		const value = JSON.stringify({ v: 1, found: ["console", "matrix"] });
		window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue: value }));
		expect(state.count).toBe(2);
		window.dispatchEvent(new StorageEvent("storage", { key: null }));
		expect(state.count).toBe(0);
	});

	it("survives blocked storage", async () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		const store = await load();
		store.markFound("lost");
		expect(store.isFound("lost")).toBe(true);
	});
});
