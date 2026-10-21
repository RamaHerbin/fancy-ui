import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { INSTALL_SNIPPETS, INSTALL_VARIANTS } from "./install-snippets.js";

const PACKAGE_DIRS = [
	["svelte", "."],
	["react", "react"],
	["vue", "vue"],
] as const;

function readPkg(dir: string) {
	return JSON.parse(readFileSync(`${dir}/package.json`, "utf8")) as {
		peerDependencies: Record<string, string>;
		peerDependenciesMeta?: Record<string, { optional?: boolean }>;
	};
}

function optionalOf(dir: string): string[] {
	return Object.entries(readPkg(dir).peerDependenciesMeta ?? {})
		.filter(([, meta]) => meta.optional)
		.map(([name]) => name);
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
			const all = [s.stylesheet, s.firstComponent, s.usage, s.types, s.imports].join("\n");
			for (const other of others[framework]) expect(all).not.toContain(other);
			expect(all).toContain(`fancy-ui-${framework}`);
		}
	});

	it("loads the React stylesheet in CSS and in JS, and the Vue one entirely in CSS", () => {
		expect(INSTALL_SNIPPETS.react.stylesheet).toContain("fancy-ui-react/tailwind.css");
		expect(INSTALL_SNIPPETS.react.firstComponent).toContain('import "fancy-ui-react/styles.css"');
		expect(INSTALL_SNIPPETS.vue.stylesheet).toContain("fancy-ui-vue/styles.css");
	});

	it("lists every required peer dependency the three packages declare", () => {
		for (const [framework, dir] of PACKAGE_DIRS) {
			const optional = optionalOf(dir);
			const required = Object.keys(readPkg(dir).peerDependencies).filter(
				(n) => !optional.includes(n)
			);
			const listed = INSTALL_SNIPPETS[framework].peers.map((p) => p.name);
			expect([...listed].sort()).toEqual([...required].sort());
		}
	});

	it("lists the peer ranges the three packages declare, read from disk", () => {
		for (const [framework, dir] of PACKAGE_DIRS) {
			const declared = readPkg(dir).peerDependencies;
			for (const peer of INSTALL_SNIPPETS[framework].peers) {
				expect(declared[peer.name]).toBe(peer.range);
			}
		}
	});

	it("pins Svelte to the declared ^5.20.0", () => {
		const svelte = INSTALL_SNIPPETS.svelte.peers.find((p) => p.name === "svelte");
		expect(svelte?.range).toBe("^5.20.0");
	});

	it("lists SvelteKit as an optional peer for Svelte only, with the declared range", () => {
		const declared = readPkg(".").peerDependencies;
		const kit = INSTALL_SNIPPETS.svelte.optionalPeers.find((p) => p.name === "@sveltejs/kit");
		expect(kit?.range).toBe(declared["@sveltejs/kit"]);
		expect(kit?.range).toBe(">=2.0.0");
		expect(INSTALL_SNIPPETS.svelte.peers.map((p) => p.name)).not.toContain("@sveltejs/kit");
		for (const framework of ["react", "vue"] as const) {
			expect(INSTALL_SNIPPETS[framework].optionalPeers.map((p) => p.name)).not.toContain(
				"@sveltejs/kit"
			);
		}
	});

	it("keeps optional peers in sync with peerDependenciesMeta", () => {
		for (const [framework, dir] of PACKAGE_DIRS) {
			const listed = INSTALL_SNIPPETS[framework].optionalPeers.map((p) => p.name);
			expect([...listed].sort()).toEqual(optionalOf(dir).sort());
			for (const peer of INSTALL_SNIPPETS[framework].optionalPeers) {
				expect(readPkg(dir).peerDependencies[peer.name]).toBe(peer.range);
			}
		}
	});

	it("offers a one-line import on each framework's own package", () => {
		for (const framework of ["svelte", "react", "vue"] as const) {
			const { imports } = INSTALL_SNIPPETS[framework];
			expect(imports).toContain(`fancy-ui-${framework}`);
			expect(imports.split("\n")).toHaveLength(1);
		}
	});

	it("builds the install variants from the three packages", () => {
		expect(INSTALL_VARIANTS.map((v) => v.framework)).toEqual(["svelte", "react", "vue"]);
		for (const v of INSTALL_VARIANTS) {
			expect(v.package).toBe(`fancy-ui-${v.framework}`);
			expect(v.installLine).toBe(`pnpm add fancy-ui-${v.framework}`);
			expect(v.importLine).toContain(`fancy-ui-${v.framework}`);
		}
	});
});
