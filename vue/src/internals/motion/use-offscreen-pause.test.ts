import { defineComponent, h, nextTick, useTemplateRef } from "vue";
import { render } from "@testing-library/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOffscreenPause } from "./use-offscreen-pause.js";
import { FakeIntersectionObserver } from "../../test-setup.js";

const Probe = defineComponent({
	name: "Probe",
	setup() {
		const box = useTemplateRef<HTMLDivElement>("box");
		useOffscreenPause(box);
		return () => h("div", { ref: "box", "data-testid": "box" });
	},
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useOffscreenPause", () => {
	it("sets the attribute when out of view and removes it when back in view", async () => {
		const { getByTestId } = render(Probe);
		await nextTick();
		const io = FakeIntersectionObserver.instances.at(-1)!;
		io.trigger(false);
		expect(getByTestId("box").hasAttribute("data-ft-offscreen")).toBe(true);
		io.trigger(true);
		expect(getByTestId("box").hasAttribute("data-ft-offscreen")).toBe(false);
	});

	it("never sets the attribute without IntersectionObserver", async () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const { getByTestId } = render(Probe);
		await nextTick();
		expect(getByTestId("box").hasAttribute("data-ft-offscreen")).toBe(false);
	});

	it("disconnects on unmount", async () => {
		const { unmount } = render(Probe);
		await nextTick();
		const io = FakeIntersectionObserver.instances.at(-1)!;
		unmount();
		expect(io.elements.size).toBe(0);
	});
});
