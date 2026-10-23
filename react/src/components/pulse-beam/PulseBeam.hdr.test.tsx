import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PulseBeam } from "./PulseBeam.js";

describe("PulseBeam HDR layer", () => {
	afterEach(cleanup);

	it("renders the overlay canvas by default, hidden from assistive tech", () => {
		const { container } = render(<PulseBeam />);
		const canvas = container.querySelector("canvas.pulse-beam__hdr");
		expect(canvas).not.toBeNull();
		expect(canvas?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders no canvas with hdr={false}", () => {
		const { container } = render(<PulseBeam hdr={false} />);
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("sets no data-hdr without WebGPU", () => {
		const { container } = render(<PulseBeam />);
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});
});
