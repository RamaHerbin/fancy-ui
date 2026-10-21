import { describe, it, expect } from "vitest";
import svelteRaw from "../../../../CHANGELOG.md?raw";
import reactRaw from "../../../../react/CHANGELOG.md?raw";
import vueRaw from "../../../../vue/CHANGELOG.md?raw";
import { parseChangelog } from "./changelog-data.js";
import { CHANGELOG_PACKAGES, buildChangelogPackages } from "./changelog-packages.js";

describe("the three real changelog files", () => {
	for (const [name, raw] of [
		["svelte", svelteRaw],
		["react", reactRaw],
		["vue", vueRaw],
	] as const) {
		it(`${name}: parses into versions with sections and unique anchors`, () => {
			const versions = parseChangelog(raw);
			expect(versions.length).toBeGreaterThan(0);
			const anchors = versions.map((v) => v.anchor);
			expect(new Set(anchors).size).toBe(anchors.length);
			for (const v of versions) {
				expect(v.version).toMatch(/^\d+\.\d+\.\d+/);
				expect(v.sections.length).toBeGreaterThan(0);
			}
		});
	}

	it("prefixes anchors so the same version number never collides across packages", () => {
		const a = parseChangelog(reactRaw, "react")[0].anchor;
		const b = parseChangelog(vueRaw, "vue")[0].anchor;
		expect(a.startsWith("react-v")).toBe(true);
		expect(b.startsWith("vue-v")).toBe(true);
		expect(parseChangelog(svelteRaw)[0].anchor.startsWith("v")).toBe(true);
	});

	it("renders the release preamble as an unlabeled first section above the bump groups", () => {
		for (const [raw, prefix, version] of [
			[svelteRaw, "", "0.17.0"],
			[reactRaw, "react", "0.6.0"],
			[vueRaw, "vue", "0.3.0"],
		] as const) {
			const entry = parseChangelog(raw, prefix).find((v) => v.version === version);
			expect(entry, `${prefix || "svelte"} ${version}`).toBeDefined();
			const [preamble, next] = entry!.sections;
			expect(preamble.kind).toBe("");
			expect(preamble.html).toContain("<em>The night-shift release.</em>");
			expect(preamble.html).toContain("Then the sun came up, and we shipped.");
			expect(preamble.html).not.toContain("<li>");
			expect(next.kind).toBe("Minor Changes");
		}
	});

	it("builds the three tabs in a fixed order from the raw files", () => {
		expect(CHANGELOG_PACKAGES.map((p) => p.id)).toEqual(["svelte", "react", "vue"]);
		const pkgs = buildChangelogPackages({ svelte: svelteRaw, react: reactRaw, vue: vueRaw });
		expect(pkgs.map((p) => p.name)).toEqual(["fancy-ui-svelte", "fancy-ui-react", "fancy-ui-vue"]);
		for (const p of pkgs) expect(p.raw.length).toBeGreaterThan(0);
	});
});
