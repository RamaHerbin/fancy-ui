import { describe, expect, it } from "vitest";
import { frameworksFor, variantFor, variantsFor, variantsForAll } from "./variants.js";

describe("framework variants", () => {
	it("gives pulse-beam three variants in canonical order", () => {
		const variants = variantsFor("pulse-beam");
		expect(variants.map((v) => v.framework)).toEqual(["svelte", "react", "vue"]);
		for (const v of variants) {
			expect(v.exports).toContain("PulseBeam");
			expect(v.importLine).toBe(`import { PulseBeam } from "${v.package}";`);
			expect(v.docsUrl).toBe("/docs/components/pulse-beam");
		}
		expect(variants[0]).toMatchObject({
			package: "fancy-ui-svelte",
			availability: "available",
			installLine: "pnpm add fancy-ui-svelte",
			note: null,
		});
		expect(variants[1]).toMatchObject({
			package: "fancy-ui-react",
			availability: "available",
			installLine: "pnpm add fancy-ui-react",
		});
	});

	it("marks Vue source-only with no install line while the package is unpublished", () => {
		const vue = variantFor("pulse-beam", "vue");
		expect(vue.availability).toBe("source-only");
		expect(vue.installLine).toBeNull();
		expect(vue.importLine).not.toBeNull();
		expect(vue.note).toMatch(/not on npm yet/);
	});

	it("reports every framework unavailable for an unknown slug", () => {
		const variants = variantsFor("definitely-not-a-component");
		expect(variants.every((v) => v.availability === "unavailable")).toBe(true);
		expect(variants.every((v) => v.importLine === null && v.installLine === null)).toBe(true);
		expect(variants.every((v) => typeof v.note === "string")).toBe(true);
		expect(frameworksFor("definitely-not-a-component")).toEqual([]);
	});

	it("dedupes slugs in the batch helper", () => {
		const all = variantsForAll(["pulse-beam", "pulse-beam", "meteors"]);
		expect(Object.keys(all)).toEqual(["pulse-beam", "meteors"]);
	});
});
