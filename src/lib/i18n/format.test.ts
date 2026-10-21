import { afterEach, describe, expect, it, vi } from "vitest";
import { formatList } from "./format.js";

const EDITIONS = ["Svelte 5", "React", "Vue 3"];

describe("formatList", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("joins with the English conjunction", () => {
		expect(formatList(EDITIONS, "en")).toBe("Svelte 5, React, and Vue 3");
	});

	it("joins with the French conjunction", () => {
		expect(formatList(EDITIONS, "fr")).toBe("Svelte 5, React et Vue 3");
	});

	it("handles one and two items", () => {
		expect(formatList(["Svelte 5"], "fr")).toBe("Svelte 5");
		expect(formatList(["Svelte 5", "React"], "en")).toBe("Svelte 5 and React");
	});

	it("falls back to a comma list without Intl.ListFormat", () => {
		vi.stubGlobal("Intl", { ...Intl, ListFormat: undefined });
		expect(formatList(EDITIONS, "de")).toBe("Svelte 5, React, Vue 3");
	});

	it("survives an invalid locale tag", () => {
		expect(formatList(["a", "b"], "not a locale")).toBe("a and b");
	});
});
