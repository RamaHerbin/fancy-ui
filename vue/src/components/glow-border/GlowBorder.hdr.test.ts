import { render, cleanup } from "@testing-library/vue";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { conicBorderProbe } from "../../internals/hdr/hdr-probes.js";
import GlowBorder, { GLOW_BORDER_PRESETS } from "./GlowBorder.vue";

vi.mock("../../internals/hdr/hdr-probes.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../internals/hdr/hdr-probes.js")>();
	return { ...actual, conicBorderProbe: vi.fn(actual.conicBorderProbe) };
});

describe("GlowBorder HDR layer", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.mocked(conicBorderProbe).mockClear();
	});

	it("takes the dark palette from a scoped .dark ancestor, as the CSS does", async () => {
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
		const Scoped = defineComponent({
			render: () => h("div", { class: "dark" }, [h(GlowBorder, { hdr: true })]),
		});
		render(Scoped);
		await nextTick();
		await nextTick();
		expect(conicBorderProbe).toHaveBeenCalledTimes(1);
		const [arc] = vi.mocked(conicBorderProbe).mock.calls[0]![0].arcs();
		// The tail of the glint (t = 0) takes the palette's third tint.
		expect(arc!.color(0)).toBe(GLOW_BORDER_PRESETS.chromatic.dark.tints[2]);
	});
});
