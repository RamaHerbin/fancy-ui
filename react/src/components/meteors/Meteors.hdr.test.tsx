import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Meteors } from "./Meteors.js";

describe("Meteors HDR layer", () => {
	afterEach(cleanup);

	it("renders the overlay canvas by default", () => {
		const { container } = render(
			<div>
				<Meteors />
			</div>
		);
		expect(container.querySelector("canvas")).not.toBeNull();
	});

	it("renders no canvas with hdr={false}", () => {
		const { container } = render(
			<div>
				<Meteors hdr={false} />
			</div>
		);
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("sets no data-hdr without WebGPU", () => {
		const { container } = render(
			<div>
				<Meteors />
			</div>
		);
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});
});
