import { render, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { AnimatedLogoCloud } from "./index.js";

const mockLogos = [
	{ name: "Svelte", path: "/svelte.svg" },
	{ name: "React", path: "/react.svg" },
];

describe("AnimatedLogoCloud", () => {
	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const mask = container.querySelector(".logo-cloud-mask");
		expect(mask).toBeInTheDocument();
	});

	it("renders 5 scroll groups", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const scrolls = container.querySelectorAll(".logo-cloud-scroll");
		expect(scrolls.length).toBe(5);
	});

	it("renders correct number of logo images per group", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const firstGroup = container.querySelector(".logo-cloud-scroll");
		const imgs = firstGroup?.querySelectorAll("img");
		expect(imgs?.length).toBe(2);
	});

	it("sets correct alt on logo images", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("alt", "Svelte");
	});

	// Regression: all five marquee tracks used to carry the same alt text, so a
	// screen reader announced the whole roster five times. The duplicates are
	// presentation, not content.
	it("names each logo once, however many times the track is cloned", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);

		expect(container.querySelectorAll("img")).toHaveLength(10);
		// Only the one real track reaches the accessibility tree.
		expect(screen.getAllByRole("img")).toHaveLength(2);
		expect(screen.getAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual([
			"Svelte",
			"React",
		]);
	});

	it("hides the cloned tracks from assistive tech, alt included", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const tracks = Array.from(container.querySelectorAll(".logo-cloud-scroll"));

		expect(tracks[0]?.getAttribute("aria-hidden")).toBeNull();
		for (const clone of tracks.slice(1)) {
			expect(clone.getAttribute("aria-hidden")).toBe("true");
			for (const img of clone.querySelectorAll("img")) {
				expect(img.getAttribute("alt")).toBe("");
			}
		}
	});

	it("renders title when provided", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} title="Our Partners" />);
		expect(container.textContent).toContain("Our Partners");
	});

	it("does not render title when not provided", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} />);
		const titleDiv = container.querySelector(".text-center");
		expect(titleDiv).not.toBeInTheDocument();
	});

	it("applies custom class names", () => {
		const { container } = render(<AnimatedLogoCloud logos={mockLogos} className="custom-cloud" />);
		const mask = container.querySelector(".logo-cloud-mask");
		expect(mask?.className).toContain("custom-cloud");
	});
});
