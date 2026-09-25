import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Compare, { beamPalette, beamStep, keyStep, COMPARE_BEAM_COLORS } from "./Compare.svelte";

describe("Compare", () => {
	afterEach(cleanup);

	it('renders a container with role="slider"', () => {
		const { container } = render(Compare);
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toBeInTheDocument();
	});

	it("has overflow-hidden class", () => {
		const { container } = render(Compare);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("overflow-hidden");
	});

	it("renders image elements when image props are provided", () => {
		const { container } = render(Compare, {
			props: { firstImage: "/a.jpg", secondImage: "/b.jpg" },
		});
		const imgs = container.querySelectorAll("img");
		expect(imgs.length).toBeGreaterThanOrEqual(2);
	});

	it("sets correct src and alt on first image", () => {
		const { container } = render(Compare, {
			props: { firstImage: "/a.jpg", firstImageAlt: "Before" },
		});
		const imgs = container.querySelectorAll("img");
		const firstImg = Array.from(imgs).find((img) => img.getAttribute("alt") === "Before");
		expect(firstImg).toHaveAttribute("src", "/a.jpg");
	});

	it("sets correct src and alt on second image", () => {
		const { container } = render(Compare, {
			props: { secondImage: "/b.jpg", secondImageAlt: "After" },
		});
		const imgs = container.querySelectorAll("img");
		const secondImg = Array.from(imgs).find((img) => img.getAttribute("alt") === "After");
		expect(secondImg).toHaveAttribute("src", "/b.jpg");
	});

	it("applies custom class names", () => {
		const { container } = render(Compare, { props: { class: "my-compare" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-compare");
	});

	it("has aria-valuenow set to initial slider percentage", () => {
		const { container } = render(Compare, {
			props: { initialSliderPercentage: 75 },
		});
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toHaveAttribute("aria-valuenow", "75");
	});

	it("has aria-valuemin and aria-valuemax attributes", () => {
		const { container } = render(Compare);
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toHaveAttribute("aria-valuemin", "0");
		expect(slider).toHaveAttribute("aria-valuemax", "100");
	});
});

describe("Compare beam", () => {
	afterEach(cleanup);

	it("renders the beam layers and a glass handle", () => {
		const { container } = render(Compare);
		for (const part of ["glow", "trail", "fringe", "core", "pulse"]) {
			expect(container.querySelector(`.compare-beam__${part}`)).toBeInTheDocument();
		}
		expect(container.querySelector(".compare-handle")).toBeInTheDocument();
	});

	it("hides the handle when showHandlebar is false", () => {
		const { container } = render(Compare, { props: { showHandlebar: false } });
		expect(container.querySelector(".compare-handle")).toBeNull();
	});

	it("sets the beam colours as CSS variables", () => {
		const { container } = render(Compare, { props: { beamColors: ["red", "lime", "blue"] } });
		const root = container.querySelector('[role="slider"]') as HTMLElement;
		expect(root.style.getPropertyValue("--cmp-c1")).toBe("red");
		expect(root.style.getPropertyValue("--cmp-c2")).toBe("lime");
		expect(root.style.getPropertyValue("--cmp-c3")).toBe("blue");
	});

	it("has an accessible name", () => {
		const { container } = render(Compare, { props: { label: "Before and after" } });
		expect(container.querySelector('[role="slider"]')).toHaveAttribute(
			"aria-label",
			"Before and after"
		);
	});

	it("moves with the arrow keys, Shift for big steps, Home/End for the ends", async () => {
		const seen: number[] = [];
		const { container } = render(Compare, {
			props: { onpercentagechange: (p: number) => seen.push(p) },
		});
		const slider = container.querySelector('[role="slider"]') as HTMLElement;
		await fireEvent.keyDown(slider, { key: "ArrowRight" });
		expect(slider).toHaveAttribute("aria-valuenow", "52");
		await fireEvent.keyDown(slider, { key: "ArrowLeft", shiftKey: true });
		expect(slider).toHaveAttribute("aria-valuenow", "42");
		await fireEvent.keyDown(slider, { key: "End" });
		expect(slider).toHaveAttribute("aria-valuenow", "100");
		await fireEvent.keyDown(slider, { key: "Home" });
		expect(slider).toHaveAttribute("aria-valuenow", "0");
		expect(seen).toEqual([52, 42, 100, 0]);
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
