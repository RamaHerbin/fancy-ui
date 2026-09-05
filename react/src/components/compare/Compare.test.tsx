import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { StrictMode, useLayoutEffect } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Compare } from "./Compare.js";
import { StarField } from "./StarField.js";

/**
 * A hand-driven frame queue. The component's pointer path and its autoplay loop
 * both schedule work on `requestAnimationFrame`; a test that wants to observe
 * WHEN that work runs (or that it never runs) has to own the clock.
 */
function frameQueue() {
	let nextId = 1;
	const pending = new Map<number, FrameRequestCallback>();
	const request = vi
		.spyOn(window, "requestAnimationFrame")
		.mockImplementation((callback: FrameRequestCallback) => {
			const id = nextId++;
			pending.set(id, callback);
			return id;
		});
	vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => {
		pending.delete(id);
	});
	return {
		request,
		get size() {
			return pending.size;
		},
		/** Run every frame queued so far, exactly once. */
		flush() {
			const callbacks = [...pending.values()];
			pending.clear();
			act(() => {
				for (const callback of callbacks) callback(0);
			});
		},
	};
}

function sliderOf(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="slider"]') as HTMLElement;
}

describe("Compare", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

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

	describe("autoplay", () => {
		// Regression: the loop started in a passive effect, so the first painted
		// frame still showed the divider at initialSliderPercentage and only the
		// next one snapped it to the autoplay start. Svelte starts it in
		// `onMount`, which the browser runs before it paints.
		it("starts the loop before the first paint, not a frame after it", () => {
			const frames = frameQueue();
			let requestsAtLayout = -1;

			// A sibling layout effect runs after Compare's own layout effects and
			// before every passive effect in the commit — so what it sees here is
			// exactly what the browser would have painted.
			function Probe() {
				useLayoutEffect(() => {
					requestsAtLayout = frames.request.mock.calls.length;
				}, []);
				return null;
			}

			const { container } = render(
				<>
					<Compare autoplay />
					<Probe />
				</>
			);

			expect(requestsAtLayout).toBeGreaterThan(0);
			const painted = Number(sliderOf(container).getAttribute("aria-valuenow"));
			expect(painted).toBeLessThan(1);
		});

		it("runs a single loop when StrictMode mounts it twice", () => {
			const frames = frameQueue();
			render(
				<StrictMode>
					<Compare autoplay />
				</StrictMode>
			);
			expect(frames.size).toBe(1);
		});

		it("announces through the callback the latest render handed it", () => {
			const frames = frameQueue();
			const first = vi.fn();
			const second = vi.fn();
			const { rerender } = render(<Compare autoplay onpercentagechange={first} />);

			first.mockClear();
			rerender(<Compare autoplay onpercentagechange={second} />);
			frames.flush();

			expect(second).toHaveBeenCalled();
			expect(first).not.toHaveBeenCalled();
		});
	});

	describe("pointer moves", () => {
		// Regression: the frame a move scheduled was never cancelled, so a move
		// followed by an unmount committed into a component that was gone, and a
		// burst of moves inside one frame committed several times over.
		it("drops a pending move frame when the component goes away", () => {
			const frames = frameQueue();
			const onpercentagechange = vi.fn();
			const { container, unmount } = render(<Compare onpercentagechange={onpercentagechange} />);

			fireEvent.mouseMove(sliderOf(container), { clientX: 10 });
			expect(frames.size).toBe(1);

			unmount();
			frames.flush();

			expect(onpercentagechange).not.toHaveBeenCalled();
		});

		it("collapses a burst of moves into one commit", () => {
			const frames = frameQueue();
			const onpercentagechange = vi.fn();
			const { container } = render(<Compare onpercentagechange={onpercentagechange} />);
			const el = sliderOf(container);

			fireEvent.mouseMove(el, { clientX: 10 });
			fireEvent.mouseMove(el, { clientX: 20 });
			fireEvent.mouseMove(el, { clientX: 30 });
			expect(frames.size).toBe(1);

			frames.flush();
			expect(onpercentagechange).toHaveBeenCalledTimes(1);
		});
	});

	describe("star field", () => {
		// Compare re-renders once per autoplay frame and once per pointer move.
		// The memo boundary is what keeps those frames from rebuilding 120 star
		// elements and diffing their inline styles to write nothing.
		it("stops reconciliation at the star field", () => {
			expect((StarField as unknown as { $$typeof?: symbol }).$$typeof).toBe(
				Symbol.for("react.memo")
			);
		});

		it("still renders the same sky", () => {
			const { container } = render(<Compare />);
			expect(container.querySelectorAll(".fancy-star-field .star")).toHaveLength(120);
		});
	});
});
