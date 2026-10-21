import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { INSTALL_SNIPPETS } from "./install-snippets.js";

function peersOf(dir: string): Record<string, string> {
	const pkg = JSON.parse(readFileSync(`${dir}/package.json`, "utf8"));
	return pkg.peerDependencies;
}

describe("install snippets", () => {
	it("keeps each framework's code on its own package", () => {
		const others = {
			svelte: ["fancy-ui-react", "fancy-ui-vue"],
			react: ["fancy-ui-svelte", "fancy-ui-vue"],
			vue: ["fancy-ui-react", "fancy-ui-svelte"],
		} as const;
		for (const framework of ["svelte", "react", "vue"] as const) {
			const s = INSTALL_SNIPPETS[framework];
			const all = [s.stylesheet, s.firstComponent, s.usage, s.types].join("\n");
			for (const other of others[framework]) expect(all).not.toContain(other);
			expect(all).toContain(`fancy-ui-${framework}`);
		}
	});

	it("loads the React stylesheet in CSS and in JS, and the Vue one entirely in CSS", () => {
		expect(INSTALL_SNIPPETS.react.stylesheet).toContain("fancy-ui-react/tailwind.css");
		expect(INSTALL_SNIPPETS.react.firstComponent).toContain('import "fancy-ui-react/styles.css"');
		expect(INSTALL_SNIPPETS.vue.stylesheet).toContain("fancy-ui-vue/styles.css");
	});

	it("lists the peer ranges the packages declare", () => {
		for (const [framework, dir] of [
			["react", "react"],
			["vue", "vue"],
		] as const) {
			const declared = peersOf(dir);
			for (const peer of INSTALL_SNIPPETS[framework].peers) {
				expect(declared[peer.name]).toBe(peer.range);
			}
		}
	});
});
