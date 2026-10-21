import { render, cleanup, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi, type MockInstance } from "vitest";
import ExamplesSection from "./ExamplesSection.svelte";
import { examplesRegistry } from "./examples/registry.js";

// A failing example must stay a local failure: the error shows in its own frame, the
// real error reaches the console, and every other example on the page still mounts.

const { createHighlighter } = vi.hoisted(() => ({
	createHighlighter: vi.fn(async () => ({
		codeToHtml: () => "<pre>highlighted</pre>",
		loadLanguage: async () => {},
	})),
}));
vi.mock("shiki", () => ({ createHighlighter }));

// Hoisted with the mocks below, which run before any top-level statement.
const { RENDER_ERROR, IMPORT_ERROR } = vi.hoisted(() => ({
	RENDER_ERROR: new Error("example exploded while rendering"),
	IMPORT_ERROR: new Error("example chunk failed to load"),
}));

// Throws as soon as Svelte mounts it: a component is a plain function on the client.
vi.mock("./examples/shimmer-button/BasicUsage.svelte", () => ({
	default: () => {
		throw RENDER_ERROR;
	},
}));

// Rejects the dynamic import itself, as a missing or broken chunk would.
vi.mock("./examples/rainbow-button/BasicUsage.svelte", () => {
	throw IMPORT_ERROR;
});

const LOAD = { timeout: 10_000 };

let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
	consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	consoleError.mockRestore();
});

function previewStages(container: HTMLElement) {
	return Array.from(
		container.querySelectorAll<HTMLElement>('[data-pane="preview"] [data-thumb-stage]')
	);
}

describe("ExamplesSection failure isolation", { timeout: 20_000 }, () => {
	it("shows a visible error state for an example that throws while rendering", async () => {
		const { container } = render(ExamplesSection, { slug: "shimmer-button" });
		const stages = previewStages(container);
		expect(stages).toHaveLength(examplesRegistry["shimmer-button"].length);

		const failed = await waitFor(() => {
			const el = stages[0].querySelector<HTMLElement>('[data-preview-error="render"]');
			expect(el).not.toBeNull();
			return el!;
		}, LOAD);
		expect(failed).toHaveTextContent("This preview could not be loaded.");
		expect(failed).toHaveAttribute("role", "alert");
	});

	it("logs the real render error instead of swallowing it", async () => {
		const { container } = render(ExamplesSection, { slug: "shimmer-button" });
		await waitFor(
			() => expect(container.querySelector("[data-preview-error]")).not.toBeNull(),
			LOAD
		);
		expect(consoleError.mock.calls.flat()).toContain(RENDER_ERROR);
	});

	it("still mounts the other examples next to the one that threw", async () => {
		const { container } = render(ExamplesSection, { slug: "shimmer-button" });
		const stages = previewStages(container);
		await waitFor(() => {
			for (const stage of stages.slice(1)) {
				expect(stage.querySelector("[data-preview-error]")).toBeNull();
				expect(stage.childElementCount).toBeGreaterThan(0);
			}
		}, LOAD);
	});

	it("logs a failed example import and still loads the rest independently", async () => {
		const { container } = render(ExamplesSection, { slug: "rainbow-button" });
		const stages = previewStages(container);
		expect(stages.length).toBeGreaterThan(1);

		await waitFor(() => {
			for (const stage of stages.slice(1)) expect(stage.childElementCount).toBeGreaterThan(0);
		}, LOAD);
		await waitFor(() => {
			const logged = consoleError.mock.calls.map((args) => args.map(String).join(" ")).join("\n");
			expect(logged).toContain("rainbow-button/BasicUsage.svelte");
		}, LOAD);
		// The real error object is logged too, not just a message about it.
		expect(consoleError.mock.calls.some((args) => args.some((a) => a instanceof Error))).toBe(true);
		// The failed example says so in its own frame; its source stays readable.
		expect(stages[0].querySelector('[data-preview-error="import"]')).toHaveTextContent(
			"This preview could not be loaded."
		);
	});
});
