import { render, cleanup, waitFor } from "@testing-library/svelte";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import DemoRenderer, { previewBox, defaultProps } from "./DemoRenderer.svelte";

beforeAll(() => {
	// jsdom has no layout engine: stub what the canvas components touch on mount.
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	);
	HTMLCanvasElement.prototype.getContext = (() => null) as any;
});

afterEach(cleanup);

// Components whose root is `size-full` over an absolutely positioned layer: they
// collapse to 0 in any container without a definite height.
const FILL_ROOT = ["sparkles", "bg-stars"];

describe("DemoRenderer sized stage", () => {
	it.each(FILL_ROOT)("wraps %s in a stage with a definite height", async (slug) => {
		const { container } = render(DemoRenderer, { slug });
		const stage = await waitFor(() => {
			const el = container.querySelector<HTMLElement>("[data-demo-stage]");
			expect(el).toBeInTheDocument();
			return el!;
		});
		expect(stage.className).toContain("h-[300px]");
		expect(stage.className).toContain("w-full");
		expect(stage.className).toContain("relative");
		expect(stage.firstElementChild).not.toBeNull();
	});

	it("keeps the override map to plain class strings", () => {
		for (const value of Object.values(previewBox)) {
			expect(typeof value).toBe("string");
		}
	});

	// The preview frame is `flex items-center justify-center`: a stage that is a plain
	// block would pin its content to the top-left corner, so it must centre its own content.
	it("centres the content of every sized stage", () => {
		for (const value of Object.values(previewBox)) {
			expect(
				["flex", "items-center", "justify-center"].every((c) => value.split(/\s+/).includes(c))
			).toBe(true);
		}
	});

	// The thumbnail fit-to-frame step measures the frame's single child. Any wrapper
	// (even display: contents, which has no box) would measure 0 by 0 and skip the fit.
	it.each(["button", "glare-card", "toggle", "neon-border", "hyper-text"])(
		"renders %s without any stage wrapper",
		async (slug) => {
			const { container } = render(DemoRenderer, { slug });
			// The module loads asynchronously: wait for the spinner to go before asserting.
			await waitFor(() => {
				expect(container.querySelector(".animate-spin")).toBeNull();
				expect(container.firstElementChild).not.toBeNull();
			});
			expect(container.querySelector("[data-demo-stage]")).toBeNull();
		}
	);
});

describe("sparkles preview visibility", () => {
	it("pairs white particles with an opaque backdrop so light theme shows them", () => {
		const props = defaultProps.sparkles;
		expect(props.particleColor).toBe("#ffffff");
		expect(props.background).not.toBe("transparent");
	});
});

describe("sparkles example wrappers", () => {
	it.each(["BasicUsage", "CustomColors", "DenseAndFast"])("%s wrapper is full width", (name) => {
		const src = readFileSync(
			join(process.cwd(), `src/lib/components/docs/examples/sparkles/${name}.svelte`),
			"utf8"
		);
		const wrapper = src.match(/<div class="([^"]*)">/)?.[1] ?? "";
		expect(wrapper.split(/\s+/)).toContain("w-full");
	});
});
