import { render, cleanup, fireEvent, screen } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { createRawSnippet } from "svelte";
import ComponentPreview from "./ComponentPreview.svelte";

const { createHighlighter } = vi.hoisted(() => ({
	createHighlighter: vi.fn(async () => ({
		codeToHtml: (code: string) => `<pre class="shiki"><code>${code}</code></pre>`,
		loadLanguage: async () => {},
	})),
}));
vi.mock("shiki", () => ({ createHighlighter }));

const CODE = "<script>\n  import { ShimmerButton } from '$lib/fancy-ui';\n<\/script>";

const preview = createRawSnippet(() => ({
	render: () => `<span data-testid="live">live demo</span>`,
}));

function renderPreview(props: Record<string, unknown> = {}) {
	return render(ComponentPreview, { code: CODE, preview, ...props });
}

const pane = (container: HTMLElement, name: "preview" | "code") =>
	container.querySelector<HTMLElement>(`[data-pane="${name}"]`);

describe("ComponentPreview", () => {
	afterEach(() => {
		cleanup();
		createHighlighter.mockClear();
	});

	// Regression: the code pane used to live behind `{#if activeTab === "code"}`, so the
	// snippet only existed once a human clicked the tab and never in the served HTML.
	it("mounts the code pane up front and hides it while the preview tab is active", () => {
		const { container } = renderPreview();
		const code = pane(container, "code");
		expect(code).toBeInTheDocument();
		expect(code).toHaveAttribute("hidden");
		expect(pane(container, "preview")).not.toHaveAttribute("hidden");
	});

	it("serves the source inside a plain pre/code even while hidden", () => {
		const { container } = renderPreview();
		const block = pane(container, "code")?.querySelector("pre code");
		expect(block).toBeInTheDocument();
		expect(block?.textContent).toContain("ShimmerButton");
	});

	it("skips the highlighter entirely while the code pane is inactive", () => {
		renderPreview();
		expect(createHighlighter).not.toHaveBeenCalled();
	});

	it("moves the hidden attribute between panes when the tab changes", async () => {
		const { container } = renderPreview();

		await fireEvent.click(screen.getByRole("button", { name: "Code" }));
		expect(pane(container, "code")).not.toHaveAttribute("hidden");
		expect(pane(container, "preview")).toHaveAttribute("hidden");

		await fireEvent.click(screen.getByRole("button", { name: "Preview" }));
		expect(pane(container, "code")).toHaveAttribute("hidden");
		expect(pane(container, "preview")).not.toHaveAttribute("hidden");
	});

	it("creates the highlighter only once the code pane becomes active", async () => {
		renderPreview();
		expect(createHighlighter).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole("button", { name: "Code" }));
		// The highlighter arrives through a dynamic import, so it lands a few microtasks later.
		await vi.waitFor(() => expect(createHighlighter).toHaveBeenCalledTimes(1));
	});

	it("keeps the preview pane and its min-height mounted even without a live component", () => {
		const empty = createRawSnippet(() => ({ render: () => `<span></span>` }));
		const { container } = renderPreview({ preview: empty });
		const box = pane(container, "preview")?.querySelector(".min-h-\\[200px\\]");
		expect(box).toBeInTheDocument();
	});

	it("omits the code tab and pane when there is no source", () => {
		const { container } = renderPreview({ code: "" });
		expect(pane(container, "code")).toBeNull();
		expect(screen.queryByRole("button", { name: "Code" })).toBeNull();
		expect(pane(container, "preview")).not.toHaveAttribute("hidden");
	});
});
