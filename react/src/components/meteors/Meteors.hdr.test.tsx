import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { meteorsProbe } from "../../internals/hdr/hdr-probes.js";
import { Meteors } from "./Meteors.js";

vi.mock("../../internals/hdr/hdr-probes.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../internals/hdr/hdr-probes.js")>();
	return { ...actual, meteorsProbe: vi.fn(actual.meteorsProbe) };
});

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

describe("Meteors HDR layer", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.mocked(meteorsProbe).mockClear();
	});

	it("renders no canvas by default in an environment without WebGPU", () => {
		const { container } = render(
			<div>
				<Meteors />
			</div>
		);
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});

	it("renders the overlay canvas on a WebGPU, HDR-capable device", () => {
		stubHdrCapable();
		const { container } = render(
			<div>
				<Meteors hdr />
			</div>
		);
		expect(container.querySelector("canvas")).not.toBeNull();
	});

	it("keeps HDR off by default, and never renders a canvas with hdr={false}", () => {
		stubHdrCapable();
		const byDefault = render(
			<div>
				<Meteors />
			</div>
		);
		expect(byDefault.container.querySelector("canvas")).toBeNull();
		cleanup();
		const { container } = render(
			<div>
				<Meteors hdr={false} />
			</div>
		);
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("lights only its own meteors when showers share a container", () => {
		stubHdrCapable();
		const { container } = render(
			<div>
				<Meteors hdr count={3} />
				<Meteors count={4} />
			</div>
		);
		expect(container.querySelectorAll(".meteor")).toHaveLength(7);
		expect(meteorsProbe).toHaveBeenCalledTimes(1);
		const own = [...vi.mocked(meteorsProbe).mock.calls[0]![0].meteors()];
		const all = [...container.querySelectorAll(".meteor")];
		expect(own).toEqual(all.slice(0, 3));
	});
});
