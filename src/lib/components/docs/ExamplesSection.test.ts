import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ExamplesSection from "./ExamplesSection.svelte";
import { examplesRegistry } from "./examples/registry.js";

// The examples' code panes start inactive, so no highlighter should ever be created here.
// Mocked anyway to keep the suite off the real shiki/wasm path.
const { createHighlighter } = vi.hoisted(() => ({
	createHighlighter: vi.fn(async () => ({
		codeToHtml: () => "<pre>highlighted</pre>",
		loadLanguage: async () => {},
	})),
}));
vi.mock("shiki", () => ({ createHighlighter }));

const SLUG = "shimmer-button";

describe("ExamplesSection", () => {
	afterEach(() => {
		cleanup();
		createHighlighter.mockClear();
	});

	// Regression: examples used to load through an $effect into $state behind
	// `{#if !loading}`, so no prerendered page contained the section at all.
	it("renders the section heading synchronously, without waiting for any effect", () => {
		const { container } = render(ExamplesSection, { slug: SLUG });
		const heading = container.querySelector("h2#examples");
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent("Examples");
	});

	it("renders every registered example's title and description in the initial markup", () => {
		const { container } = render(ExamplesSection, { slug: SLUG });
		const entries = examplesRegistry[SLUG];
		expect(entries.length).toBeGreaterThan(0);

		const headings = Array.from(container.querySelectorAll("h3")).map((h) => h.textContent?.trim());
		const text = container.textContent ?? "";

		for (const entry of entries) {
			expect(headings).toContain(entry.title);
			if (entry.description) expect(text).toContain(entry.description);
		}
	});

	it("gives each example a stable anchor id derived from its title", () => {
		const { container } = render(ExamplesSection, { slug: SLUG });
		expect(container.querySelector("h3#example-basic-usage")).toBeInTheDocument();
		expect(container.querySelector("h3#example-shimmer-colors")).toBeInTheDocument();
	});

	it("puts the raw example source in the markup, one code pane per example", () => {
		const { container } = render(ExamplesSection, { slug: SLUG });
		const panes = container.querySelectorAll('[data-pane="code"] pre code');
		expect(panes).toHaveLength(examplesRegistry[SLUG].length);
		expect(panes[0].textContent).toContain("ShimmerButton");
	});

	it("leaves an equally sized empty placeholder where the live example will mount", () => {
		const { container } = render(ExamplesSection, { slug: SLUG });
		const previewPanes = container.querySelectorAll('[data-pane="preview"] .min-h-\\[200px\\]');
		expect(previewPanes).toHaveLength(examplesRegistry[SLUG].length);
		// Nothing rendered inside yet: the server HTML and the first client render must match.
		expect(previewPanes[0].textContent?.trim()).toBe("");
	});

	it("does not create a highlighter for panes that are not on screen", () => {
		render(ExamplesSection, { slug: SLUG });
		expect(createHighlighter).not.toHaveBeenCalled();
	});

	it("renders nothing for a slug with no registered examples", () => {
		const { container } = render(ExamplesSection, { slug: "not-a-component" });
		expect(container.querySelector("section")).toBeNull();
		expect(container.querySelector("h2#examples")).toBeNull();
	});
});
