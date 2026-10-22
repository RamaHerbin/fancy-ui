import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ASTRO_SNIPPETS, ASTRO_VERSIONS } from "./astro-snippets.js";
import { INSTALL_SNIPPETS } from "./install-snippets.js";

// The Installation page prints these snippets; the Svelte consumer apps under
// examples/consumers compile them. Keeping them identical means a snippet that
// stops compiling is caught by the consumer build, not by a reader.
const apps = ["sveltekit", "svelte-vite"] as const;
const files = [
	["first-component", "FirstComponent.svelte", "firstComponent"],
	["usage", "Usage.svelte", "usage"],
	["types", "types.ts", "types"],
] as const;

describe("svelte consumer apps carry the install snippets verbatim", () => {
	for (const app of apps) {
		for (const [label, file, key] of files) {
			it(`${app}: ${label}`, () => {
				const source = readFileSync(`examples/consumers/${app}/src/snippets/${file}`, "utf8");
				expect(source.trim()).toBe(INSTALL_SNIPPETS.svelte[key].trim());
			});
		}
		it(`${app}: stylesheet`, () => {
			const css = readFileSync(`examples/consumers/${app}/src/app.css`, "utf8");
			expect(css.trim()).toBe(INSTALL_SNIPPETS.svelte.stylesheet.trim());
		});
	}
});

describe("the astro consumer app carries the Astro snippets verbatim", () => {
	const app = "examples/consumers/astro";
	const read = (file: string) => readFileSync(`${app}/${file}`, "utf8").trim();

	it("stylesheet", () => {
		expect(read("src/styles/global.css")).toBe(INSTALL_SNIPPETS.svelte.stylesheet.trim());
	});
	it("config", () => {
		expect(read("astro.config.mjs")).toBe(ASTRO_SNIPPETS.config);
	});
	it("static usage", () => {
		expect(read("src/components/Hero.astro")).toBe(ASTRO_SNIPPETS.staticUsage);
	});
	it("island", () => {
		expect(read("src/islands/Counter.svelte")).toBe(ASTRO_SNIPPETS.island);
	});
	it("island usage", () => {
		const page = read("src/pages/index.astro");
		for (const line of ASTRO_SNIPPETS.islandUsage.split("\n").filter((l) => l && l !== "---")) {
			expect(page).toContain(line);
		}
	});
	it("versions", () => {
		const pkg = JSON.parse(read("package.json"));
		expect(pkg.dependencies.astro).toBe(ASTRO_VERSIONS.astro);
		expect(pkg.dependencies["@astrojs/svelte"]).toBe(ASTRO_VERSIONS.integration);
		const script = readFileSync("scripts/consumers/astro.sh", "utf8");
		expect(script).toContain(`ASTRO_NODE_FLOOR="${ASTRO_VERSIONS.node}"`);
	});
});
