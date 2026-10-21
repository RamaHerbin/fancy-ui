import { describe, it, expect } from "vitest";
import { getUsageSnippet, snippetSlugs } from "./framework-snippets.js";

const PRIORITY = [
	"button",
	"input",
	"select",
	"dialog",
	"rainbow-button",
	"gradient-button",
	"border-beam",
	"fluid-cursor",
	"image-trail-cursor",
	"liquid-glass",
	"thinking-indicator",
];
const PRIORITY = ["button", "input", "select", "dialog", "rainbow-button", "glow-border", "reveal"];
	"composer",
	"chat-panel",
];

describe("framework snippets", () => {
	it("has a React and a Vue snippet for every priority component", () => {
		expect(snippetSlugs("react")).toEqual([...PRIORITY].sort());
		expect(snippetSlugs("vue")).toEqual([...PRIORITY].sort());
	});

	it("serves React as tsx importing the React package only", () => {
		for (const slug of PRIORITY) {
			const snippet = getUsageSnippet(slug, "react");
			expect(snippet?.lang).toBe("tsx");
			expect(snippet?.code).toContain('from "fancy-ui-react"');
			expect(snippet?.code).not.toContain("<script");
			expect(snippet?.code).not.toContain("fancy-ui-vue");
			expect(snippet?.code).not.toContain("fancy-ui-svelte");
		}
	});

	it("serves Vue as an SFC importing the Vue package only", () => {
		for (const slug of PRIORITY) {
			const snippet = getUsageSnippet(slug, "vue");
			expect(snippet?.lang).toBe("vue");
			expect(snippet?.code).toContain('from "fancy-ui-vue"');
			expect(snippet?.code).toContain("<template>");
			expect(snippet?.code).not.toContain("fancy-ui-react");
		}
	});

	it("returns null for Svelte and for a component without a snippet", () => {
		expect(getUsageSnippet("button", "svelte")).toBeNull();
		expect(getUsageSnippet("no-such-component", "react")).toBeNull();
		expect(getUsageSnippet("aurora", "vue")).toBeNull();
	});
});
