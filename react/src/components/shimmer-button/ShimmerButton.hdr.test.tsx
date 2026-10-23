import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ShimmerButton } from "./ShimmerButton.js";

describe("ShimmerButton HDR layer", () => {
	afterEach(cleanup);

	it("renders the overlay canvas by default, hidden from assistive tech", () => {
		const { container } = render(<ShimmerButton />);
		const canvas = container.querySelector("canvas.shimmer-button__hdr");
		expect(canvas).not.toBeNull();
		expect(canvas?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders no canvas with hdr={false}", () => {
		const { container } = render(<ShimmerButton hdr={false} />);
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("sets no data-hdr without WebGPU", () => {
		const { container } = render(<ShimmerButton />);
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});
});
