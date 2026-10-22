import { describe, expect, it } from "vitest";
import { getAllComponents } from "$lib/fancy-ui/registry.js";
import { copySourceFor } from "./copy-availability.js";
import { copyCommandFor } from "./registry/constants.js";
import { sourceTreeUrl } from "$lib/site.js";
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

	it("offers a copy-source line for React, Svelte and Vue", () => {
		const [svelte, react, vue] = variantsFor("pulse-beam");
		expect(react.copyLine).toBe(copyCommandFor("pulse-beam"));
		expect(react.copyLine).toMatch(/\/r\/pulse-beam\.json$/);
		expect(react.copyImportLine).toBe(
			'import { PulseBeam } from "@/components/ui/fancy/components/pulse-beam";'
		);
		expect(svelte.copyLine).toBe(copyCommandFor("pulse-beam", "svelte"));
		expect(svelte.copyLine).toMatch(/\/r\/svelte\/pulse-beam\.json$/);
		expect(svelte.copyImportLine).toBe(
			'import { PulseBeam } from "$lib/components/ui/fancy/pulse-beam";'
		);
		expect(vue.copyLine).toBe(copyCommandFor("pulse-beam", "vue"));
		expect(vue.copyLine).toMatch(/\/r\/vue\/pulse-beam\.json$/);
		expect(vue.copyImportLine).toBe(
			'import { PulseBeam } from "@/components/ui/fancy/components/pulse-beam";'
		);
	});

	it("takes the copy line and its import from the registries the site serves", () => {
		for (const c of getAllComponents()) {
			for (const v of variantsFor(c.slug)) {
				const source = v.exports.length ? copySourceFor(c.slug, v.framework) : null;
				const at = `${v.framework}/${c.slug}`;
				expect(v.copyLine, at).toBe(source?.command ?? null);
				expect(v.copyImportLine, at).toBe(
					source ? `import { ${v.exports.join(", ")} } from "${source.importPath}";` : null
				);
			}
		}
	});

	it("imports the sound module from where the copy lands and links its real source folder", () => {
		const [svelte, react, vue] = variantsFor("sound");
		expect(svelte.copyImportLine).toMatch(/ from "\$lib\/components\/ui\/fancy\/sound";$/);
		expect(react.copyImportLine).toMatch(/ from "@\/components\/ui\/fancy\/sound";$/);
		expect(vue.copyImportLine).toMatch(/ from "@\/components\/ui\/fancy\/sound";$/);
		expect(react.sourceUrl).toMatch(/\/react\/src\/sound$/);
		expect(vue.sourceUrl).toMatch(/\/vue\/src\/sound$/);
	});

	it("links every framework's source on the develop branch", () => {
		const [svelte, react, vue] = variantsFor("pulse-beam");
		expect(svelte.sourceUrl).toBe(sourceTreeUrl("src/lib/fancy-ui/pulse-beam"));
		expect(react.sourceUrl).toMatch(/\/tree\/develop\/react\/src\/.*pulse-beam$/);
		expect(vue.sourceUrl).toMatch(/\/tree\/develop\/vue\/src\/.*pulse-beam$/);
	});

	it("installs Vue like the other two now that the package is on npm", () => {
		const vue = variantFor("pulse-beam", "vue");
		expect(vue.availability).toBe("available");
		expect(vue.installLine).toMatch(/fancy-ui-vue/);
		expect(vue.importLine).toMatch(/from "fancy-ui-vue"/);
	});

	it("reports every framework unavailable for an unknown slug", () => {
		const variants = variantsFor("definitely-not-a-component");
		expect(variants.every((v) => v.availability === "unavailable")).toBe(true);
		expect(
			variants.every((v) => v.importLine === null && v.installLine === null && v.copyLine === null)
		).toBe(true);
		expect(variants.every((v) => typeof v.note === "string")).toBe(true);
		expect(frameworksFor("definitely-not-a-component")).toEqual([]);
	});

	it("dedupes slugs in the batch helper", () => {
		const all = variantsForAll(["pulse-beam", "pulse-beam", "meteors"]);
		expect(Object.keys(all)).toEqual(["pulse-beam", "meteors"]);
	});
});
