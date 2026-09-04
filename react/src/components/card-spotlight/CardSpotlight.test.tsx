import { render, cleanup, fireEvent } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, describe, it, expect } from "vitest";
import { CardSpotlight } from "./CardSpotlight.js";

const OVERLAY = ".pointer-events-none.absolute.inset-0";

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
		const overlay = container.querySelector(OVERLAY) as HTMLElement;
		expect(overlay).toBeTruthy();
		// The resting position is -gradientSize * 10 on both axes.
		expect(overlay.style.background).toContain("circle at -3000px -3000px");
		expect(overlay.style.background).toContain("#ff0000");
		expect(overlay.style.opacity).toBe("0.5");
	});

	it("responds to mousemove and mouseleave without throwing", () => {
		const { container } = render(<CardSpotlight />);
		const wrapper = container.firstElementChild as HTMLElement;
		const overlay = container.querySelector(OVERLAY) as HTMLElement;

		fireEvent.mouseMove(wrapper, { clientX: 40, clientY: 30 });
		// jsdom's getBoundingClientRect() is all zeros, so the offsets are the client
		// coordinates as dispatched.
		expect(overlay.style.background).toContain("circle at 40px 30px");

		// React derives onMouseLeave from the native mouseover/mouseout pair, so
		// dispatch the mouseout the root listener actually consumes.
		fireEvent.mouseOut(wrapper);
		expect(overlay.style.background).toContain("circle at -2000px -2000px");

		expect(container.querySelector(OVERLAY)).toBeTruthy();
	});

	it("writes the gradient without re-rendering the card on every pointer move", () => {
		let commits = 0;
		const { container } = render(
			<Profiler
				id="card-spotlight"
				onRender={() => {
					commits += 1;
				}}
			>
				<CardSpotlight />
			</Profiler>
		);
		const wrapper = container.firstElementChild as HTMLElement;
		const overlay = container.querySelector(OVERLAY) as HTMLElement;
		const afterMount = commits;

		for (let i = 0; i < 10; i += 1) {
			fireEvent.mouseMove(wrapper, { clientX: 40 + i, clientY: 30 });
		}

		expect(commits).toBe(afterMount);
		expect(overlay.style.background).toContain("circle at 49px 30px");
	});

	it("keeps the live pointer position when a gradient prop changes", () => {
		const { container, rerender } = render(<CardSpotlight />);
		const wrapper = container.firstElementChild as HTMLElement;
		const overlay = container.querySelector(OVERLAY) as HTMLElement;

		fireEvent.mouseMove(wrapper, { clientX: 40, clientY: 30 });
		rerender(<CardSpotlight gradientColor="#ff0000" />);

		expect(overlay.style.background).toContain("circle at 40px 30px");
		expect(overlay.style.background).toContain("#ff0000");
	});
});
