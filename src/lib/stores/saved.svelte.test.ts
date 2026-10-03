import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "fancy-ui-inspiration-saved";
const LEGACY = "fancy-ui-finds-saved";

async function load() {
	vi.resetModules();
	return await import("./saved.svelte.js");
}

describe("saved store", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("toggles ids and persists the versioned shape", async () => {
		const store = await load();
		const state = store.createSavedState();
		state.toggleSaved("a");
		state.toggleSaved("b");
		expect(state.list).toEqual(["a", "b"]);
		expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ v: 1, ids: ["a", "b"] });
		state.toggleSaved("a");
		expect(state.isSaved("a")).toBe(false);
		state.clearSaved();
		expect(state.count).toBe(0);
		expect(state.status).toBe("ok");
	});

	it("copies the legacy finds key into the new key and leaves it in place", async () => {
		localStorage.setItem(LEGACY, JSON.stringify(["meteors", 42, "neon-border", "meteors"]));
		const store = await load();
		expect(store.createSavedState().list).toEqual(["meteors", "neon-border"]);
		// Kept for one release so a rollback keeps its bookmarks.
		expect(localStorage.getItem(LEGACY)).not.toBeNull();
		expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
			v: 1,
			ids: ["meteors", "neon-border"],
		});
	});

	it("ignores an unknown version", async () => {
		localStorage.setItem(KEY, JSON.stringify({ v: 2, ids: ["a"] }));
		const store = await load();
		expect(store.createSavedState().count).toBe(0);
	});

	it("ignores corrupt JSON", async () => {
		localStorage.setItem(KEY, "{not json");
		const store = await load();
		expect(store.createSavedState().count).toBe(0);
	});

	it("keeps working in memory when setItem throws", async () => {
		const store = await load();
		const state = store.createSavedState();
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("QuotaExceededError");
		});
		state.toggleSaved("a");
		expect(state.isSaved("a")).toBe(true);
		expect(state.status).toBe("unavailable");
	});

	it("clears on a storage event with a null key (storage.clear in another tab)", async () => {
		localStorage.setItem(KEY, JSON.stringify({ v: 1, ids: ["a"] }));
		const store = await load();
		const state = store.createSavedState();
		expect(state.count).toBe(1);
		window.dispatchEvent(new StorageEvent("storage", { key: null }));
		expect(state.count).toBe(0);
	});

	it("follows another tab's write", async () => {
		const store = await load();
		const state = store.createSavedState();
		window.dispatchEvent(
			new StorageEvent("storage", { key: KEY, newValue: JSON.stringify({ v: 1, ids: ["x"] }) })
		);
		expect(state.list).toEqual(["x"]);
	});

	it("hides unknown ids without ever deleting them, even across writes", async () => {
		localStorage.setItem(KEY, JSON.stringify({ v: 1, ids: ["a", "gone"] }));
		const store = await load();
		const state = store.createSavedState(new Set(["a", "b"]));
		expect(state.list).toEqual(["a"]);
		expect(JSON.parse(localStorage.getItem(KEY)!).ids).toEqual(["a", "gone"]);
		state.toggleSaved("b");
		expect(state.list).toEqual(["a", "b"]);
		expect(JSON.parse(localStorage.getItem(KEY)!).ids).toEqual(["a", "gone", "b"]);
	});
});
