import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { CardSpotlight } from "./CardSpotlight.js";

describe("CardSpotlight", () => {
	afterEach(cleanup);

	it("renders the wrapper with the base card classes", () => {
		const { container } = render(<CardSpotlight />);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("rounded-xl");
		expect(wrapper.className).toContain("overflow-hidden");
	});

	it("applies custom class names to the wrapper", () => {
		const { container } = render(<CardSpotlight className="my-spotlight" />);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("my-spotlight");
	});

	it("applies slotClass to the content wrapper", () => {
		const { container } = render(<CardSpotlight slotClass="my-slot" />);
		const slot = container.querySelector(".relative.z-10") as HTMLElement;
		expect(slot.className).toContain("my-slot");
	});

	it("renders children content", () => {
		const { container } = render(
			<CardSpotlight>
				<p data-testid="content">hi</p>
			</CardSpotlight>
		);
		expect(container.querySelector("[data-testid='content']")).toBeTruthy();
	});

	it("accepts gradientSize/gradientColor/gradientOpacity without throwing and keeps the overlay in the DOM", () => {
		const { container } = render(
			<CardSpotlight gradientSize={300} gradientColor="#ff0000" gradientOpacity={0.5} />
		);
		const overlay = container.querySelector(".pointer-events-none.absolute.inset-0");
		expect(overlay).toBeTruthy();
	});

	it("responds to mousemove and mouseleave without throwing", () => {
		const { container } = render(<CardSpotlight />);
		const wrapper = container.firstElementChild as HTMLElement;

		fireEvent.mouseMove(wrapper, { clientX: 40, clientY: 30 });
		fireEvent.mouseLeave(wrapper);

		expect(container.querySelector(".pointer-events-none.absolute.inset-0")).toBeTruthy();
	});
});
