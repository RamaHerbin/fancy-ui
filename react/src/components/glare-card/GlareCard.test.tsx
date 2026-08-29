import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";

import { GlareCard } from "./GlareCard.js";

describe("GlareCard", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(<GlareCard />);
		const wrapper = container.querySelector(".glare-container");
		expect(wrapper).toBeInTheDocument();
	});

	it("has perspective class", () => {
		const { container } = render(<GlareCard />);
		const wrapper = container.querySelector(".glare-container");
		expect(wrapper?.className).toContain("[perspective:600px]");
	});

	it("has correct aspect ratio", () => {
		const { container } = render(<GlareCard />);
		const wrapper = container.querySelector(".glare-container");
		expect(wrapper?.className).toContain("[aspect-ratio:17/21]");
	});

	it("sets CSS custom properties", () => {
		const { container } = render(<GlareCard />);
		const wrapper = container.querySelector(".glare-container") as HTMLElement;
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toContain("--m-x");
		expect(style).toContain("50%");
		expect(style).toContain("--r-x");
		expect(style).toContain("0deg");
	});

	it("applies custom class", () => {
		const { container } = render(<GlareCard className="my-glare" />);
		const content = container.querySelector(".my-glare");
		expect(content).toBeInTheDocument();
	});

	it("renders foil layer", () => {
		const { container } = render(<GlareCard />);
		const foil = container.querySelector(".glare-foil");
		expect(foil).toBeInTheDocument();
	});
});
