import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import { nextTick } from "vue";
import FrostedGlass from "./FrostedGlass.vue";

describe("FrostedGlass", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(FrostedGlass);
		const wrapper = container.querySelector(".frosted-glass");
		expect(wrapper).toBeInTheDocument();
	});

	it("renders the layer stack", () => {
		const { container } = render(FrostedGlass);
		expect(container.querySelector(".frosted-glass-overlay")).toBeInTheDocument();
		expect(container.querySelector(".frosted-glass-specular")).toBeInTheDocument();
		expect(container.querySelector(".frosted-glass-content")).toBeInTheDocument();
	});

	it("applies custom container class", () => {
		const { container } = render(FrostedGlass, {
			props: { containerClass: "my-container" },
		});
		const wrapper = container.querySelector(".frosted-glass");
		expect(wrapper?.className).toContain("my-container");
	});

	it("applies custom class to content", () => {
		const { container } = render(FrostedGlass, { props: { class: "my-content" } });
		const content = container.querySelector(".frosted-glass-content");
		expect(content?.className).toContain("my-content");
	});

	it("sets border radius", () => {
		const { container } = render(FrostedGlass, { props: { radius: 9999 } });
		const wrapper = container.querySelector(".frosted-glass") as HTMLElement;
		expect(wrapper.style.borderRadius).toBe("9999px");
	});

	it("sets tint CSS variable", () => {
		const { container } = render(FrostedGlass, {
			props: { tint: "hsla(0, 0%, 0%, 0.3)" },
		});
		const wrapper = container.querySelector(".frosted-glass") as HTMLElement;
		expect(wrapper.style.getPropertyValue("--fg-tint")).toBe("hsla(0, 0%, 0%, 0.3)");
	});

	it("renders border layer by default and hides it when border=false", () => {
		const withBorder = render(FrostedGlass);
		expect(withBorder.container.querySelector(".frosted-glass-border")).toBeInTheDocument();
		cleanup();

		const withoutBorder = render(FrostedGlass, { props: { border: false } });
		expect(withoutBorder.container.querySelector(".frosted-glass-border")).not.toBeInTheDocument();
	});

	// Port addition, kept in parity with the React suite: the source mints the
	// filter id in a mount callback, so the filter layer and its <defs> only
	// exist after the mount flush. Nothing on the Svelte side covered it.
	it("wires the displacement filter to the layer that consumes it", async () => {
		const { container } = render(FrostedGlass);
		await nextTick();

		const layer = container.querySelector(".frosted-glass-filter") as HTMLElement;
		const filter = container.querySelector(".frosted-glass-defs filter") as SVGFilterElement;

		expect(layer).toBeInTheDocument();
		expect(filter).toBeInTheDocument();
		expect(layer.getAttribute("style")).toContain(`url(#${filter.id})`);
	});

	// The turbulence primitives keep their camelCase SVG attribute names, which
	// a lowercased template would silently break.
	it("feeds the turbulence primitives from the props", async () => {
		const { container } = render(FrostedGlass, {
			props: { baseFrequency: 0.02, numOctaves: 3, seed: 7, noiseBlur: 4, scale: 120 },
		});
		await nextTick();

		const turbulence = container.querySelector("feTurbulence") as SVGElement;
		expect(turbulence.getAttribute("baseFrequency")).toBe("0.02 0.02");
		expect(turbulence.getAttribute("numOctaves")).toBe("3");
		expect(turbulence.getAttribute("seed")).toBe("7");
		expect(container.querySelector("feGaussianBlur")?.getAttribute("stdDeviation")).toBe("4");
		expect(container.querySelector("feDisplacementMap")?.getAttribute("scale")).toBe("120");
	});
});
