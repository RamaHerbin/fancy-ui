import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BorderBeam } from "./BorderBeam.js";

describe("BorderBeam HDR layer", () => {
	afterEach(cleanup);

	it("renders the overlay canvas by default", () => {
		const { container } = render(<BorderBeam />);
		expect(container.querySelector("canvas")).not.toBeNull();
	});

	it("renders no canvas with hdr={false}", () => {
		const { container } = render(<BorderBeam hdr={false} />);
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("sets no data-hdr without WebGPU", () => {
		const { container } = render(<BorderBeam />);
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});
});
