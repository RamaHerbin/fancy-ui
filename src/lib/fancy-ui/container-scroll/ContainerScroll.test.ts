import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import ContainerScroll from "./ContainerScroll.svelte";

describe("ContainerScroll", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(ContainerScroll);
		const wrapper = container.firstElementChild;
		expect(wrapper).toBeInTheDocument();
	});

	it("has perspective container", () => {
		const { container } = render(ContainerScroll);
		const perspectiveDiv = container.querySelector('[style*="perspective: 1000px"]');
		expect(perspectiveDiv).toBeInTheDocument();
	});

	it("renders card container", () => {
		const { container } = render(ContainerScroll);
		const card = container.querySelector(".rounded-\\[30px\\]");
		expect(card).toBeInTheDocument();
	});

	it("applies custom class", () => {
		const { container } = render(ContainerScroll, {
			props: { class: "my-scroll" },
		});
		const wrapper = container.firstElementChild;
		expect(wrapper?.className).toContain("my-scroll");
	});

	it("has initial rotation transform", () => {
		const { container } = render(ContainerScroll);
		const card = container.querySelector(".rounded-\\[30px\\]") as HTMLElement;
		const style = card?.getAttribute("style") ?? "";
		expect(style).toContain("rotateX(");
	});
});
