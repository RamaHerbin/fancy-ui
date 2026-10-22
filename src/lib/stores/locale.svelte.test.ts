import { describe, it, expect } from "vitest";
import { componentDocTitle } from "./locale.svelte.js";

describe("componentDocTitle", () => {
	it("names the three frameworks, not only Svelte", () => {
		expect(componentDocTitle("RainbowButton", "buttons")).toBe(
			"RainbowButton — button component for Svelte, React and Vue | FancyUI"
		);
	});

	it("stays backward compatible: the framework argument is optional and does not change the title", () => {
		expect(componentDocTitle("Meteors", "effects")).toBe(
			componentDocTitle("Meteors", "effects", "react")
		);
		expect(componentDocTitle("Meteors", "effects", "vue")).toBe(
			"Meteors — effect component for Svelte, React and Vue | FancyUI"
		);
	});

	it("falls back to the category name when it has no singular term", () => {
		expect(componentDocTitle("X", "ai-chat")).toBe(
			"X — ai-chat component for Svelte, React and Vue | FancyUI"
		);
	});
});
