import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { ShimmerButton } from "./ShimmerButton.js";

describe("ShimmerButton", () => {
	afterEach(cleanup);

	it("renders a button element", () => {
		render(<ShimmerButton />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("applies default CSS custom properties", () => {
		render(<ShimmerButton />);
		const button = screen.getByRole("button");
		const style = button.getAttribute("style") ?? "";
		expect(style).toContain("--shimmer-color: #ffffff");
		expect(style).toContain("--speed: 3s");
		expect(style).toContain("--bg: rgba(0, 0, 0, 1)");
	});

	it("applies custom shimmerColor", () => {
		render(<ShimmerButton shimmerColor="#ff0000" />);
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--shimmer-color: #ff0000");
	});

	it("applies custom background", () => {
		render(<ShimmerButton background="rgba(0, 0, 255, 0.5)" />);
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--bg: rgba(0, 0, 255, 0.5)");
	});

	it("applies custom shimmerDuration", () => {
		render(<ShimmerButton shimmerDuration="5s" />);
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--speed: 5s");
	});

	it("applies custom borderRadius", () => {
		render(<ShimmerButton borderRadius="8px" />);
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--radius: 8px");
	});

	it("applies custom class names", () => {
		render(<ShimmerButton className="my-shimmer" />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("my-shimmer");
	});

	it("preserves base classes when custom class is added", () => {
		render(<ShimmerButton className="extra" />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("shimmer-button");
		expect(button.className).toContain("overflow-hidden");
	});

	it("contains shimmer layer div", () => {
		render(<ShimmerButton />);
		const button = screen.getByRole("button");
		const shimmerLayer = button.querySelector(".shimmer-slide");
		expect(shimmerLayer).toBeInTheDocument();
	});

	it("contains spin-around element", () => {
		render(<ShimmerButton />);
		const button = screen.getByRole("button");
		const spinAround = button.querySelector(".spin-around");
		expect(spinAround).toBeInTheDocument();
	});

	it("forwards native button attributes", () => {
		render(<ShimmerButton disabled aria-label="Submit" />);
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-label", "Submit");
	});
});
