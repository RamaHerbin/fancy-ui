import { describe, it, expect } from "vitest";
import { getUsageSnippet, snippetSlugs } from "./framework-snippets.js";
import { registry } from "../fancy-ui/registry.js";

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
	"glow-border",
	"reveal",
	"composer",
	"chat-panel",
	"accordion",
	"collapsible",
];

const FORMS_AND_OVERLAYS = [
	"icon-button",
	"copy-button",
	"toggle-group",
	"textarea",
	"checkbox",
	"switch",
	"radio-group",
	"form-field",
	"combobox",
	"sheet",
	"popover",
	"alert-dialog",
	"toast",
	"dropdown-menu",
	"tabs",
	"navigation-menu",
];

const COVERED = [...PRIORITY, ...FORMS_AND_OVERLAYS];

describe("framework snippets", () => {
	it("has a React and a Vue snippet for every priority component", () => {
		for (const framework of ["react", "vue"] as const) {
			for (const slug of PRIORITY) expect(snippetSlugs(framework)).toContain(slug);
		}
	});

	it("covers the forms-and-overlays batch in both packages (33 slugs in all)", () => {
		expect(COVERED).toHaveLength(33);
		for (const framework of ["react", "vue"] as const) {
			for (const slug of FORMS_AND_OVERLAYS) expect(snippetSlugs(framework)).toContain(slug);
		}
	});

	it("only has snippets named after a real component slug, and the same set in both packages", () => {
		for (const framework of ["react", "vue"] as const) {
			for (const slug of snippetSlugs(framework)) {
				expect(
					registry[slug],
					`${framework} docs-examples/${slug} is not a component slug`
				).toBeDefined();
			}
		}
		expect([...snippetSlugs("react")].sort()).toEqual([...snippetSlugs("vue")].sort());
	});

	it("serves React as tsx importing the React package only", () => {
		for (const slug of COVERED) {
			const snippet = getUsageSnippet(slug, "react");
			expect(snippet?.lang).toBe("tsx");
			expect(snippet?.code).toContain('from "fancy-ui-react"');
			expect(snippet?.code).not.toContain("<script");
			expect(snippet?.code).not.toContain("fancy-ui-vue");
			expect(snippet?.code).not.toContain("fancy-ui-svelte");
		}
	});

	it("serves Vue as an SFC importing the Vue package only", () => {
		for (const slug of COVERED) {
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
