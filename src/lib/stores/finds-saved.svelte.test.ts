import { beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "fancy-ui-finds-saved";

async function load() {
	vi.resetModules();
	return await import("./finds-saved.svelte.js");
}

describe("finds-saved store", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("starts empty and toggles ids in and out", async () => {
		const store = await load();
		const state = store.createSavedState();
		expect(state.count).toBe(0);
		store.toggleSaved("meteors");
		expect(state.isSaved("meteors")).toBe(true);
		expect(state.ids.has("meteors")).toBe(true);
		store.toggleSaved("meteors");
		expect(state.isSaved("meteors")).toBe(false);
	});

	it("persists as JSON under the storage key", async () => {
		const store = await load();
		store.toggleSaved("a");
		store.toggleSaved("b");
		expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["a", "b"]);
		store.clearSaved();
		expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([]);
	});

	it("restores saved ids on a fresh import", async () => {
		localStorage.setItem(KEY, JSON.stringify(["neon-border", 42, "meteors"]));
		const store = await load();
		expect([...store.createSavedState().ids]).toEqual(["neon-border", "meteors"]);
	});

	it("ignores corrupt storage", async () => {
		localStorage.setItem(KEY, "{not json");
		const store = await load();
		expect(store.createSavedState().count).toBe(0);
	});
});
