import { render, cleanup, waitFor } from "@testing-library/svelte";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import DemoRenderer, { previewBox } from "./DemoRenderer.svelte";

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
