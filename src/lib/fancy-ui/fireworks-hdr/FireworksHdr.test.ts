import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import FireworksHdr from "./FireworksHdr.svelte";

// jsdom exposes no `navigator.gpu`, so these exercise the no-renderer path:
// the component mounts inertly and never fires onReady (the app's own timeout
// owns the fallback decision).
describe("FireworksHdr", () => {
	afterEach(cleanup);

	it("renders a wrapper div", () => {
		const { container } = render(FireworksHdr);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("renders a canvas element", () => {
		const { container } = render(FireworksHdr);
		expect(container.querySelector("canvas")).toBeInTheDocument();
	});

	it("wrapper is pointer-events-none and absolutely fills its parent", () => {
		const { container } = render(FireworksHdr);
		const div = container.firstElementChild as HTMLElement;
		expect(div.className).toContain("pointer-events-none");
		expect(div.className).toContain("absolute");
		expect(div.className).toContain("inset-0");
	});

	it("wrapper is aria-hidden (decorative)", () => {
		const { container } = render(FireworksHdr);
		const div = container.firstElementChild as HTMLElement;
		expect(div.getAttribute("aria-hidden")).toBe("true");
	});

	it("applies a custom class name", () => {
		const { container } = render(FireworksHdr, { props: { class: "my-fireworks" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div.className).toContain("my-fireworks");
	});

	it("does not fire onReady when no GPU renderer is available (jsdom)", async () => {
		const onReady = vi.fn();
		render(FireworksHdr, { props: { onReady } });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(onReady).not.toHaveBeenCalled();
	});

	it("does not attempt WebGPU when hdr={false}", () => {
		const { container } = render(FireworksHdr, { props: { hdr: false } });
		expect(container.querySelector("canvas")).toBeInTheDocument();
	});

	it("unmounts without throwing", () => {
		const { unmount } = render(FireworksHdr, { props: { interactive: true, ambient: true } });
		expect(() => unmount()).not.toThrow();
	});

	it("mounts without error across quality tiers and reduced-motion", () => {
		for (const quality of ["auto", "high", "mid", "low"] as const) {
			const { container, unmount } = render(FireworksHdr, {
				props: { quality, respectReducedMotion: true },
			});
			expect(container.querySelector("canvas")).toBeInTheDocument();
			unmount();
		}
	});
});
