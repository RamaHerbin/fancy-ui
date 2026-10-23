import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Compare } from "./Compare.js";

describe("Compare HDR layer", () => {
	afterEach(cleanup);

	it("renders the overlay canvas by default, hidden from assistive tech", () => {
		const { container } = render(<Compare />);
		const canvas = container.querySelector("canvas.pointer-events-none");
		expect(canvas).not.toBeNull();
		expect(canvas?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders no canvas with hdr={false}", () => {
		const { container } = render(<Compare hdr={false} />);
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("sets no data-hdr without WebGPU", () => {
		const { container } = render(<Compare />);
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});
});
