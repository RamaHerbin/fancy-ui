import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { StrictMode, useLayoutEffect } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Compare, beamPalette, beamStep, keyStep, COMPARE_BEAM_COLORS } from "./Compare.js";
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

/**
 * Report a reduced-motion preference. The beam's own motion loop is skipped
 * under it, so a frame count observes only the loop a test is about.
 */
function reduceMotion() {
	vi.spyOn(window, "matchMedia").mockImplementation(
		(query: string) =>
			({
				matches: query.includes("reduce"),
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				addListener: () => {},
				removeListener: () => {},
				dispatchEvent: () => false,
			}) as MediaQueryList
	);
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

	describe("autoplay", () => {
		// Regression: the loop started in a passive effect, so the first painted
		// frame still showed the divider at initialSliderPercentage and only the
		// next one snapped it to the autoplay start. Svelte starts it in
		// `onMount`, which the browser runs before it paints.
		it("starts the loop before the first paint, not a frame after it", () => {
			reduceMotion();
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
			reduceMotion();
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
			reduceMotion();
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
			reduceMotion();
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
		// A star field inside a host that re-renders every frame must not rebuild
		// its 120 star elements: the memo boundary stops reconciliation there.
		it("stops reconciliation at the star field", () => {
			expect((StarField as unknown as { $$typeof?: symbol }).$$typeof).toBe(
				Symbol.for("react.memo")
			);
		});

		it("still renders the same sky", () => {
			const { container } = render(<StarField starsCount={120} />);
			expect(container.querySelectorAll(".fancy-star-field .star")).toHaveLength(120);
		});
	});
});

describe("Compare beam", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders the beam layers and a glass handle", () => {
		const { container } = render(<Compare />);
		for (const part of ["glow", "trail", "fringe", "core", "pulse"]) {
			expect(container.querySelector(`.compare-beam__${part}`)).toBeInTheDocument();
		}
		expect(container.querySelector(".compare-handle")).toBeInTheDocument();
	});

	it("hides the handle when showHandlebar is false", () => {
		const { container } = render(<Compare showHandlebar={false} />);
		expect(container.querySelector(".compare-handle")).toBeNull();
	});

	it("sets the beam colours as CSS variables", () => {
		const { container } = render(<Compare beamColors={["red", "lime", "blue"]} />);
		const root = sliderOf(container);
		expect(root.style.getPropertyValue("--cmp-c1")).toBe("red");
		expect(root.style.getPropertyValue("--cmp-c2")).toBe("lime");
		expect(root.style.getPropertyValue("--cmp-c3")).toBe("blue");
	});

	it("has an accessible name", () => {
		const { container } = render(<Compare label="Before and after" />);
		expect(sliderOf(container)).toHaveAttribute("aria-label", "Before and after");
	});

	it("moves with the arrow keys, Shift for big steps, Home/End for the ends", () => {
		const seen: number[] = [];
		const { container } = render(<Compare onpercentagechange={(p) => seen.push(p)} />);
		const slider = sliderOf(container);
		fireEvent.keyDown(slider, { key: "ArrowRight" });
		expect(slider).toHaveAttribute("aria-valuenow", "52");
		fireEvent.keyDown(slider, { key: "ArrowLeft", shiftKey: true });
		expect(slider).toHaveAttribute("aria-valuenow", "42");
		fireEvent.keyDown(slider, { key: "End" });
		expect(slider).toHaveAttribute("aria-valuenow", "100");
		fireEvent.keyDown(slider, { key: "Home" });
		expect(slider).toHaveAttribute("aria-valuenow", "0");
		expect(seen).toEqual([52, 42, 100, 0]);
	});

	it("leaves keys it does not handle alone, and claims the ones it does", () => {
		const onpercentagechange = vi.fn();
		const { container } = render(<Compare onpercentagechange={onpercentagechange} />);
		// `fireEvent` returns false once something called preventDefault.
		expect(fireEvent.keyDown(sliderOf(container), { key: "a" })).toBe(true);
		expect(onpercentagechange).not.toHaveBeenCalled();
		expect(fireEvent.keyDown(sliderOf(container), { key: "ArrowRight" })).toBe(false);
	});
});

describe("beamPalette", () => {
	it("falls back to the default colours", () => {
		expect(beamPalette(undefined)).toEqual(COMPARE_BEAM_COLORS);
		expect(beamPalette([])).toEqual(COMPARE_BEAM_COLORS);
	});

	it("spreads one, two or many colours over three slots", () => {
		expect(beamPalette(["red"])).toEqual(["red", "red", "red"]);
		expect(beamPalette(["red", "blue"])).toEqual(["red", "color-mix(in srgb, red, blue)", "blue"]);
		expect(beamPalette(["a", "b", "c", "d", "e"])).toEqual(["a", "c", "e"]);
	});
});

describe("beamStep", () => {
	it("stretches the trail with speed, on the side of the motion", () => {
		expect(beamStep(0, 0, 10, 0).trail).toBeGreaterThan(0);
		expect(beamStep(0, 0, -10, 0).trail).toBeLessThan(0);
	});

	it("caps the trail and lets it settle to zero", () => {
		expect(beamStep(0, 0, 1000, 0).trail).toBe(140);
		let s = { trail: 60, energy: 0 };
		for (let i = 0; i < 200; i++) s = beamStep(s.trail, s.energy, 0, 0);
		expect(s.trail).toBe(0);
	});

	it("eases the energy toward its target, kicked up by speed", () => {
		let s = { trail: 0, energy: 0 };
		for (let i = 0; i < 200; i++) s = beamStep(s.trail, s.energy, 0, 1);
		expect(s.energy).toBeCloseTo(1, 2);
		expect(beamStep(0, 0, 20, 0).energy).toBeGreaterThan(0);
	});
});

describe("keyStep", () => {
	it("maps keys to positions and clamps", () => {
		expect(keyStep("ArrowRight", false, 99)).toBe(100);
		expect(keyStep("ArrowLeft", true, 5)).toBe(0);
		expect(keyStep("PageUp", false, 50)).toBe(60);
		expect(keyStep("Enter", false, 50)).toBeNull();
	});
});
