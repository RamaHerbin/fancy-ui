import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import CardSpotlight from "./CardSpotlight.vue";

describe("CardSpotlight", () => {
	afterEach(cleanup);

	it("renders the wrapper with the base card classes", () => {
		const { container } = render(CardSpotlight);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("rounded-xl");
		expect(wrapper.className).toContain("overflow-hidden");
	});

	it("applies custom class names to the wrapper", () => {
		const { container } = render(CardSpotlight, { props: { class: "my-spotlight" } });
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("my-spotlight");
	});

	it("applies slotClass to the content wrapper", () => {
		const { container } = render(CardSpotlight, { props: { slotClass: "my-slot" } });
		const slot = container.querySelector(".relative.z-10") as HTMLElement;
		expect(slot.className).toContain("my-slot");
	});

	it("renders children content", () => {
		const { container } = render(CardSpotlight, {
			slots: { default: "<p data-testid='content'>hi</p>" },
		});
		expect(container.querySelector("[data-testid='content']")).toBeTruthy();
	});

	it("accepts gradientSize/gradientColor/gradientOpacity without throwing and keeps the overlay in the DOM", () => {
		const { container } = render(CardSpotlight, {
			props: { gradientSize: 300, gradientColor: "#ff0000", gradientOpacity: 0.5 },
		});
		const overlay = container.querySelector(".pointer-events-none.absolute.inset-0");
		expect(overlay).toBeTruthy();
	});

	it("responds to mousemove and mouseleave without throwing", async () => {
		const { container } = render(CardSpotlight);
		const wrapper = container.firstElementChild as HTMLElement;

		await fireEvent.mouseMove(wrapper, { clientX: 40, clientY: 30 });
		await fireEvent.mouseLeave(wrapper);

		// The awaits above would reject if either handler threw.
		expect(container.querySelector(".pointer-events-none.absolute.inset-0")).toBeTruthy();
	});
	it("renders the HDR overlay canvas only where WebGPU and an HDR display exist", async () => {
		// jsdom: no navigator.gpu, so no canvas at all.
		const sdr = render(CardSpotlight);
		await nextTick();
		expect(sdr.container.querySelector("canvas")).toBeNull();
		cleanup();

		vi.stubGlobal("navigator", { ...navigator, gpu: {} });
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: query === "(dynamic-range: high)",
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
		}));
		const on = render(CardSpotlight);
		await nextTick();
		const canvas = on.container.querySelector("canvas");
		expect(canvas).not.toBeNull();
		// The light itself never starts without a real adapter: no flag.
		expect(on.container.querySelector("[data-hdr]")).toBeNull();
		cleanup();
		const off = render(CardSpotlight, { props: { hdr: false } });
		await nextTick();
		expect(off.container.querySelector("canvas")).toBeNull();
		vi.unstubAllGlobals();
	});
});
