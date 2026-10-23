import { render, cleanup } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { conicBorderProbe } from "../_internals/hdr/hdr-probes.js";
import GlowBorder, { GLOW_BORDER_PRESETS } from "./GlowBorder.svelte";

vi.mock("../_internals/hdr/hdr-probes.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../_internals/hdr/hdr-probes.js")>();
	return { ...actual, conicBorderProbe: vi.fn(actual.conicBorderProbe) };
});

describe("GlowBorder HDR layer", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.mocked(conicBorderProbe).mockClear();
		document.body.innerHTML = "";
	});

	it("takes the dark palette from a scoped .dark ancestor, as the CSS does", () => {
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
		const scope = document.createElement("div");
		scope.className = "dark";
		document.body.appendChild(scope);
		render(GlowBorder, { target: scope, props: { hdr: true } });
		flushSync();
		expect(conicBorderProbe).toHaveBeenCalledTimes(1);
		const [arc] = vi.mocked(conicBorderProbe).mock.calls[0]![0].arcs();
		// The tail of the glint (t = 0) takes the palette's third tint.
		expect(arc!.color(0)).toBe(GLOW_BORDER_PRESETS.chromatic.dark.tints[2]);
	});
});
