import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PulseBeam } from "./PulseBeam.js";

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

describe("PulseBeam HDR layer", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders no canvas by default in an environment without WebGPU", () => {
		const { container } = render(<PulseBeam />);
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});

	it("renders the overlay canvas on a WebGPU, HDR-capable device", () => {
		stubHdrCapable();
		const { container } = render(<PulseBeam hdr />);
		const canvas = container.querySelector("canvas");
		expect(canvas).not.toBeNull();
		expect(canvas?.getAttribute("aria-hidden")).toBe("true");
	});

	it("keeps HDR off by default, and never renders a canvas with hdr={false}", () => {
		stubHdrCapable();
		const byDefault = render(<PulseBeam />);
		expect(byDefault.container.querySelector("canvas")).toBeNull();
		cleanup();
		const { container } = render(<PulseBeam hdr={false} />);
		expect(container.querySelector("canvas")).toBeNull();
	});
});
