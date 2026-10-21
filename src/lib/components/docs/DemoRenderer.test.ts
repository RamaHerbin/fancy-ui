import { render, cleanup, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import DemoRenderer, { defaultProps } from "./DemoRenderer.svelte";

describe("DemoRenderer theme-aware defaults", () => {
	beforeEach(() => {
		global.ResizeObserver = class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		} as unknown as typeof ResizeObserver;
		global.IntersectionObserver = class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		} as unknown as typeof IntersectionObserver;
	});

	afterEach(cleanup);

	it("previews sparkles with currentColor particles on a transparent background", () => {
		expect(defaultProps.sparkles?.particleColor).toBe("currentColor");
		expect(defaultProps.sparkles?.background).toBe("transparent");
	});

	it("renders the glow-border hero with a visible child, not an empty frame", async () => {
		const { container } = render(DemoRenderer, { slug: "glow-border" });
		await waitFor(() => {
			const label = container.querySelector("[data-glow-border-demo]");
			expect(label).toBeInTheDocument();
			expect(label?.textContent?.trim().length).toBeGreaterThan(0);
		});
	});
});
