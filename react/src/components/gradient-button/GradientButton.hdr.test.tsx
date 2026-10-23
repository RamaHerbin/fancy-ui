import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GradientButton } from "./GradientButton.js";

describe("GradientButton HDR layer", () => {
	afterEach(cleanup);

	it("renders the overlay canvas by default", () => {
		const { container } = render(<GradientButton />);
		expect(container.querySelector("canvas")).not.toBeNull();
	});

	it("renders no canvas with hdr={false}", () => {
		const { container } = render(<GradientButton hdr={false} />);
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("sets no data-hdr without WebGPU", () => {
		const { container } = render(<GradientButton />);
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});
});
