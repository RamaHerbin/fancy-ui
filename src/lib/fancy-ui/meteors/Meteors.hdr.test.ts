import { render, cleanup } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { meteorsProbe } from "../_internals/hdr/hdr-probes.js";
import Meteors from "./Meteors.svelte";

vi.mock("../_internals/hdr/hdr-probes.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../_internals/hdr/hdr-probes.js")>();
	return { ...actual, meteorsProbe: vi.fn(actual.meteorsProbe) };
});

describe("Meteors HDR layer", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.mocked(meteorsProbe).mockClear();
	});

	it("lights only its own meteors when showers share a container", () => {
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
		const parent = document.createElement("div");
		document.body.appendChild(parent);
		render(Meteors, { target: parent, props: { hdr: true, count: 3 } });
		render(Meteors, { target: parent, props: { count: 4 } });
		flushSync();
		const all = [...parent.querySelectorAll(".meteor")];
		expect(all).toHaveLength(7);
		expect(meteorsProbe).toHaveBeenCalledTimes(1);
		const own = [...vi.mocked(meteorsProbe).mock.calls[0]![0].meteors()];
		expect(own).toEqual(all.slice(0, 3));
		parent.remove();
	});
});
