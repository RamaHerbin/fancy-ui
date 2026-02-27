import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import FlipCard from "./FlipCard.svelte";

describe("FlipCard", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(FlipCard);
		const wrapper = container.querySelector(".group");
		expect(wrapper).toBeInTheDocument();
	});

	it("has perspective class", () => {
		const { container } = render(FlipCard);
		const wrapper = container.querySelector(".group");
		expect(wrapper?.className).toContain("[perspective:1000px]");
	});

	it("defaults to Y-axis rotation", () => {
		const { container } = render(FlipCard);
		const inner = container.querySelector(".group > div");
		expect(inner?.className).toContain("rotateY(180deg)");
	});

	it("supports X-axis rotation", () => {
		const { container } = render(FlipCard, { props: { rotate: "x" } });
		const inner = container.querySelector(".group > div");
		expect(inner?.className).toContain("rotateX(180deg)");
	});

	it("applies custom class", () => {
		const { container } = render(FlipCard, { props: { class: "my-card" } });
		const wrapper = container.querySelector(".group");
		expect(wrapper?.className).toContain("my-card");
	});

	it("renders front and back faces", () => {
		const { container } = render(FlipCard);
		const faces = container.querySelectorAll('[class*="backface-visibility"]');
		expect(faces.length).toBe(2);
	});
});
