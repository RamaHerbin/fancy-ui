import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { conicBorderProbe } from "../../internals/hdr/hdr-probes.js";
import { GlowBorder, GLOW_BORDER_PRESETS } from "./GlowBorder.js";

vi.mock("../../internals/hdr/hdr-probes.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../internals/hdr/hdr-probes.js")>();
	return { ...actual, conicBorderProbe: vi.fn(actual.conicBorderProbe) };
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

describe("GlowBorder HDR layer", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.mocked(conicBorderProbe).mockClear();
	});

	it("renders no canvas by default in an environment without WebGPU", () => {
		const { container } = render(<GlowBorder />);
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});

	it("renders the overlay canvas on a WebGPU, HDR-capable device", () => {
		stubHdrCapable();
		const { container } = render(<GlowBorder hdr />);
		expect(container.querySelector("canvas")).not.toBeNull();
	});

	it("keeps HDR off by default, and never renders a canvas with hdr={false}", () => {
		stubHdrCapable();
		const byDefault = render(<GlowBorder />);
		expect(byDefault.container.querySelector("canvas")).toBeNull();
		cleanup();
		const { container } = render(<GlowBorder hdr={false} />);
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("takes the dark palette from a scoped .dark ancestor, as the CSS does", () => {
		stubHdrCapable();
		render(
			<div className="dark">
				<GlowBorder hdr />
			</div>
		);
		expect(conicBorderProbe).toHaveBeenCalledTimes(1);
		const [arc] = vi.mocked(conicBorderProbe).mock.calls[0]![0].arcs();
		// The tail of the glint (t = 0) takes the palette's third tint.
		expect(arc!.color(0)).toBe(GLOW_BORDER_PRESETS.chromatic.dark.tints[2]);
	});
});
