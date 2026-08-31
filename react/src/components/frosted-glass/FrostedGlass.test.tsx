import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { FrostedGlass } from "./FrostedGlass.js";

describe("FrostedGlass", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(<FrostedGlass />);
		const wrapper = container.querySelector(".frosted-glass");
		expect(wrapper).toBeInTheDocument();
	});

	it("renders the layer stack", () => {
		const { container } = render(<FrostedGlass />);
		expect(container.querySelector(".frosted-glass-overlay")).toBeInTheDocument();
		expect(container.querySelector(".frosted-glass-specular")).toBeInTheDocument();
		expect(container.querySelector(".frosted-glass-content")).toBeInTheDocument();
	});

	it("applies custom container class", () => {
		const { container } = render(<FrostedGlass containerClass="my-container" />);
		const wrapper = container.querySelector(".frosted-glass");
		expect(wrapper?.className).toContain("my-container");
	});

	it("applies custom class to content", () => {
		const { container } = render(<FrostedGlass className="my-content" />);
		const content = container.querySelector(".frosted-glass-content");
		expect(content?.className).toContain("my-content");
	});

	it("sets border radius", () => {
		const { container } = render(<FrostedGlass radius={9999} />);
		const wrapper = container.querySelector(".frosted-glass") as HTMLElement;
		expect(wrapper.style.borderRadius).toBe("9999px");
	});

	it("sets tint CSS variable", () => {
		const { container } = render(<FrostedGlass tint="hsla(0, 0%, 0%, 0.3)" />);
		const wrapper = container.querySelector(".frosted-glass") as HTMLElement;
		expect(wrapper.style.getPropertyValue("--fg-tint")).toBe("hsla(0, 0%, 0%, 0.3)");
	});

	it("renders border layer by default and hides it when border=false", () => {
		const withBorder = render(<FrostedGlass />);
		expect(withBorder.container.querySelector(".frosted-glass-border")).toBeInTheDocument();
		cleanup();

		const withoutBorder = render(<FrostedGlass border={false} />);
		expect(withoutBorder.container.querySelector(".frosted-glass-border")).not.toBeInTheDocument();
	});

	// Port addition: the Svelte source mints the filter id in `onMount`, so the
	// filter layer and its <defs> only exist after mount. React reproduces that
	// with a state + effect pair instead of a rune, and nothing on the Svelte
	// side covered it - this is the one mechanism the transposition changed.
	it("wires the displacement filter to the layer that consumes it", () => {
		const { container } = render(<FrostedGlass />);
		const layer = container.querySelector(".frosted-glass-filter") as HTMLElement;
		const filter = container.querySelector(".frosted-glass-defs filter") as SVGFilterElement;

		expect(layer).toBeInTheDocument();
		expect(filter).toBeInTheDocument();
		expect(layer.getAttribute("style")).toContain(`url(#${filter.id})`);
	});
});
