import { describe, expect, it } from "vitest";
// @ts-expect-error — plain .mjs script without declarations
import { componentExports, renderManifest } from "../scripts/generate-manifest.mjs";
import { components } from "../src/manifest";

describe("component manifest", () => {
	it("equals the component exports of the built fancy-ui-vue root barrel", async () => {
		const mod = (await import("fancy-ui-vue")) as Record<string, unknown>;
		expect([...components]).toEqual(componentExports(mod));
		for (const name of components) {
			const value = mod[name] as Record<string, unknown> | undefined;
			expect(value, name).toBeTruthy();
			expect(typeof value!.setup === "function" || typeof value!.render === "function", name).toBe(
				true
			);
		}
	});

	it("is sorted, unique and up to date on disk", async () => {
		const sorted = [...components].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
		expect([...components]).toEqual(sorted);
		expect(new Set(components).size).toBe(components.length);
		const { readFile } = await import("node:fs/promises");
		const onDisk = await readFile(new URL("../src/manifest.ts", import.meta.url), "utf8");
		expect(onDisk).toBe(renderManifest([...components]));
	});

	it("excludes non-components and cameleon-only names", async () => {
		const list: readonly string[] = components;
		for (const name of list) {
			expect(name, name).not.toMatch(/_KEY$|^BOOK_|^[A-Z_]+$/);
		}
		for (const name of [
			"cn",
			"toast",
			"dismissToast",
			"useSound",
			"GLOW_BORDER_PRESETS",
			"DATAMOSH_PALETTES",
			"starOutline",
		]) {
			expect(list).not.toContain(name);
		}
		const root = (await import("fancy-ui-vue")) as Record<string, unknown>;
		const cameleon = (await import("fancy-ui-vue/cameleon")) as Record<string, unknown>;
		const cameleonOnly = Object.keys(cameleon).filter((k) => !(k in root));
		expect(cameleonOnly.length).toBeGreaterThan(0);
		for (const name of cameleonOnly) expect(list).not.toContain(name);
	});
});
