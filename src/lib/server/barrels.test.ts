import { describe, expect, it } from "vitest";
import { portFolderOf, reactExportsBySlug, vueExportsBySlug } from "./barrels.js";

describe("port barrels", () => {
	it("reads a top-level port module when a docs page documents it", () => {
		// The shared sound module sits next to `components/` in React and Vue.
		expect(reactExportsBySlug.get("sound")).toContain("SoundToggle");
		expect(vueExportsBySlug.get("sound")).toContain("SoundToggle");
	});

	it("skips a top-level port module that no docs page documents", () => {
		expect(reactExportsBySlug.has("cameleon")).toBe(false);
		expect(vueExportsBySlug.has("cameleon")).toBe(false);
	});

	it("knows where each port keeps the folder of a page", () => {
		expect(portFolderOf("react", "sound")).toBe("sound");
		expect(portFolderOf("vue", "sound")).toBe("sound");
		expect(portFolderOf("react", "rainbow-button")).toBe("components/rainbow-button");
		expect(portFolderOf("vue", "rainbow-button")).toBe("components/rainbow-button");
	});

	it("leaves the folder layout to the barrels instead of naming a module by hand", () => {
		// The next shared module with a page of its own must need no edit in these files.
		const sources = import.meta.glob(["./barrels.ts", "./variants.ts", "./llms.ts"], {
			query: "?raw",
			import: "default",
			eager: true,
		}) as Record<string, string>;
		expect(Object.keys(sources)).toHaveLength(3);
		for (const [path, src] of Object.entries(sources)) {
			expect(src, path).not.toMatch(/["'`/]sound["'`/]/);
		}
	});
});
