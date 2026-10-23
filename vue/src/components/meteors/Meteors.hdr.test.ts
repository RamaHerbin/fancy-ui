import { render, cleanup } from "@testing-library/vue";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { meteorsProbe } from "../../internals/hdr/hdr-probes.js";
import Meteors from "./Meteors.vue";

vi.mock("../../internals/hdr/hdr-probes.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../internals/hdr/hdr-probes.js")>();
	return { ...actual, meteorsProbe: vi.fn(actual.meteorsProbe) };
});

describe("Meteors HDR layer", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.mocked(meteorsProbe).mockClear();
	});

	it("lights only its own meteors when showers share a container", async () => {
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
		const Pair = defineComponent({
			render: () => h("div", [h(Meteors, { hdr: true, count: 3 }), h(Meteors, { count: 4 })]),
		});
		const { container } = render(Pair);
		await nextTick();
		await nextTick();
		const all = [...container.querySelectorAll(".meteor")];
		expect(all).toHaveLength(7);
		expect(meteorsProbe).toHaveBeenCalledTimes(1);
		const own = [...vi.mocked(meteorsProbe).mock.calls[0]![0].meteors()];
		expect(own).toEqual(all.slice(0, 3));
	});
});
