import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardSpotlight } from "./CardSpotlight.js";

function stubHdrCapable() {
	vi.stubGlobal("navigator", { ...navigator, gpu: {} });
	vi.stubGlobal(
		"matchMedia",
		vi.fn((q: string) => ({
			matches: q.includes("dynamic-range: high"),
			media: q,
			addEventListener() {},
			removeEventListener() {},
		}))
	);
}

describe("CardSpotlight HDR layer", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders no canvas by default in an environment without WebGPU", () => {
		const { container } = render(<CardSpotlight />);
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});

	it("renders the overlay canvas on a WebGPU, HDR-capable device", () => {
		stubHdrCapable();
		const { container } = render(<CardSpotlight />);
		const canvas = container.querySelector("canvas");
		expect(canvas).not.toBeNull();
		expect(canvas?.getAttribute("aria-hidden")).toBe("true");
	});

	it("never renders a canvas with hdr={false}", () => {
		stubHdrCapable();
		const { container } = render(<CardSpotlight hdr={false} />);
		expect(container.querySelector("canvas")).toBeNull();
	});
});
