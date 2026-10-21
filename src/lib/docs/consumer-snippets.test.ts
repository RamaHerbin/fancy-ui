import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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
