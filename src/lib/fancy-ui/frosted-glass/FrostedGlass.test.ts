import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import FrostedGlass from "./FrostedGlass.svelte";

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
});
