import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Compare } from "./Compare.js";

describe("Compare", () => {
	afterEach(cleanup);

	it('renders a container with role="slider"', () => {
		const { container } = render(<Compare />);
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toBeInTheDocument();
	});

	it("has overflow-hidden class", () => {
		const { container } = render(<Compare />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("overflow-hidden");
	});

	it("renders image elements when image props are provided", () => {
		const { container } = render(<Compare firstImage="/a.jpg" secondImage="/b.jpg" />);
		const imgs = container.querySelectorAll("img");
		expect(imgs.length).toBeGreaterThanOrEqual(2);
	});

	it("sets correct src and alt on first image", () => {
		const { container } = render(<Compare firstImage="/a.jpg" firstImageAlt="Before" />);
		const imgs = container.querySelectorAll("img");
		const firstImg = Array.from(imgs).find((img) => img.getAttribute("alt") === "Before");
		expect(firstImg).toHaveAttribute("src", "/a.jpg");
	});

	it("sets correct src and alt on second image", () => {
		const { container } = render(<Compare secondImage="/b.jpg" secondImageAlt="After" />);
		const imgs = container.querySelectorAll("img");
		const secondImg = Array.from(imgs).find((img) => img.getAttribute("alt") === "After");
		expect(secondImg).toHaveAttribute("src", "/b.jpg");
	});

	it("applies custom class names", () => {
		const { container } = render(<Compare className="my-compare" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-compare");
	});

	it("has aria-valuenow set to initial slider percentage", () => {
		const { container } = render(<Compare initialSliderPercentage={75} />);
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toHaveAttribute("aria-valuenow", "75");
	});

	it("has aria-valuemin and aria-valuemax attributes", () => {
		const { container } = render(<Compare />);
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toHaveAttribute("aria-valuemin", "0");
		expect(slider).toHaveAttribute("aria-valuemax", "100");
	});

	// Regression: the element claimed `role="slider"` and sat in the tab order
	// while offering neither a name nor a single key that moved it — a keyboard
	// or screen-reader user reached an unlabelled control and then could not
	// operate it.
	describe("keyboard and accessible name", () => {
		function slider(container: HTMLElement): HTMLElement {
			return container.querySelector('[role="slider"]') as HTMLElement;
		}

		it("carries a default accessible name", () => {
			const { container } = render(<Compare />);
			expect(slider(container)).toHaveAttribute("aria-label", "Image comparison slider");
		});

		it("lets the caller say what is being compared", () => {
			const { container } = render(<Compare ariaLabel="Before and after retouching" />);
			expect(slider(container)).toHaveAttribute("aria-label", "Before and after retouching");
		});

		it("moves the divider with the arrow keys, announcing each step", () => {
			const onpercentagechange = vi.fn();
			const { container } = render(
				<Compare initialSliderPercentage={50} onpercentagechange={onpercentagechange} />
			);

			fireEvent.keyDown(slider(container), { key: "ArrowRight" });
			expect(slider(container)).toHaveAttribute("aria-valuenow", "51");
			expect(onpercentagechange).toHaveBeenLastCalledWith(51);

			fireEvent.keyDown(slider(container), { key: "ArrowLeft" });
			fireEvent.keyDown(slider(container), { key: "ArrowLeft" });
			expect(slider(container)).toHaveAttribute("aria-valuenow", "49");
			expect(onpercentagechange).toHaveBeenLastCalledWith(49);
		});

		it("takes the coarse step with PageUp/PageDown", () => {
			const { container } = render(<Compare initialSliderPercentage={50} />);

			fireEvent.keyDown(slider(container), { key: "PageUp" });
			expect(slider(container)).toHaveAttribute("aria-valuenow", "60");

			fireEvent.keyDown(slider(container), { key: "PageDown" });
			fireEvent.keyDown(slider(container), { key: "PageDown" });
			expect(slider(container)).toHaveAttribute("aria-valuenow", "40");
		});

		it("jumps to either end with Home and End", () => {
			const onpercentagechange = vi.fn();
			const { container } = render(
				<Compare initialSliderPercentage={50} onpercentagechange={onpercentagechange} />
			);

			fireEvent.keyDown(slider(container), { key: "End" });
			expect(slider(container)).toHaveAttribute("aria-valuenow", "100");
			expect(onpercentagechange).toHaveBeenLastCalledWith(100);

			fireEvent.keyDown(slider(container), { key: "Home" });
			expect(slider(container)).toHaveAttribute("aria-valuenow", "0");
			expect(onpercentagechange).toHaveBeenLastCalledWith(0);
		});

		it("stops at the ends instead of running past them", () => {
			const { container } = render(<Compare initialSliderPercentage={100} />);

			fireEvent.keyDown(slider(container), { key: "ArrowRight" });
			expect(slider(container)).toHaveAttribute("aria-valuenow", "100");
		});

		it("leaves keys it does not handle alone", () => {
			const onpercentagechange = vi.fn();
			const { container } = render(<Compare onpercentagechange={onpercentagechange} />);

			const notHandled = fireEvent.keyDown(slider(container), { key: "a" });

			expect(onpercentagechange).not.toHaveBeenCalled();
			// `fireEvent` returns false once something called preventDefault.
			expect(notHandled).toBe(true);
		});

		it("claims the arrow key so the page does not scroll under it", () => {
			const { container } = render(<Compare />);
			const handled = fireEvent.keyDown(slider(container), { key: "ArrowRight" });
			expect(handled).toBe(false);
		});
	});
});
