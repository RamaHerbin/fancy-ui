import { render, cleanup, waitFor } from "@testing-library/svelte";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import DemoRenderer, { previewBox, DEFAULT_STAGE, defaultProps } from "./DemoRenderer.svelte";

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

// Lazy component imports can exceed waitFor's 1 s default on a cold or busy runner.
const LOAD = { timeout: 10_000 };

// Components whose root is `size-full` over an absolutely positioned layer: they
// collapse to 0 in any container without a definite height.
const FILL_ROOT = ["sparkles", "bg-stars"];

describe("DemoRenderer sized stage", () => {
	it.each(FILL_ROOT)(
		"wraps %s in a stage with a definite height",
		async (slug) => {
			const { container } = render(DemoRenderer, { slug });
			const stage = await waitFor(() => {
				const el = container.querySelector<HTMLElement>("[data-demo-stage]");
				expect(el).toBeInTheDocument();
				return el!;
			}, LOAD);
			expect(stage.className).toContain("h-[300px]");
			expect(stage.className).toContain("w-full");
			expect(stage.className).toContain("relative");
			expect(stage.firstElementChild).not.toBeNull();
		},
		20_000
	);

	it("keeps the override map to plain class strings", () => {
		for (const value of Object.values(previewBox)) {
			expect(typeof value).toBe("string");
		}
	});

	// The preview frame is `flex items-center justify-center`. A stage that is a plain
	// block would pin its content to the top-left corner, so every stage must either
	// vanish from layout (display: contents) or centre its own content.
	const centred = (cls: string) =>
		cls.split(/\s+/).includes("contents") ||
		(["flex", "items-center", "justify-center"] as const).every((c) =>
			cls.split(/\s+/).includes(c)
		);

	it("never uses a block stage that would break the frame's centring", () => {
		expect(centred(DEFAULT_STAGE)).toBe(true);
		for (const value of Object.values(previewBox)) expect(centred(value)).toBe(true);
	});

	it.each(["button", "card-spotlight", "glare-card", "neon-border", "hyper-text"])(
		"renders %s without a layout-affecting stage",
		async (slug) => {
			const { container } = render(DemoRenderer, { slug });
			const stage = await waitFor(() => {
				const el = container.querySelector<HTMLElement>("[data-demo-stage]");
				expect(el).toBeInTheDocument();
				return el!;
			}, LOAD);
			expect(stage.className.split(/\s+/)).toContain("contents");
			expect(stage.className).not.toContain("w-full");
		},
		20_000
	);
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
