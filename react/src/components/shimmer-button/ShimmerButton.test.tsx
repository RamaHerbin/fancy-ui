import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { ShimmerButton } from "./ShimmerButton.js";
import { resetSoundForTests, sound } from "../../sound/sound.js";

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

	describe("sound", () => {
		beforeEach(() => {
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays the press cue exactly once when sound is enabled and the button is clicked", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<ShimmerButton sound />);

			fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<ShimmerButton />);

			fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<ShimmerButton sound disabled />);
			const button = screen.getByRole("button");

			// Synthetic dispatch bypasses jsdom's native-disabled short-circuit,
			// proving the guard is the JS `restProps.disabled` check.
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("forwards a consumer onClick alongside the cue instead of the spread onClick silently overwriting handleClick", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onClick = vi.fn();
			render(<ShimmerButton sound onClick={onClick} />);

			fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
			expect(onClick).toHaveBeenCalledTimes(1);
		});
	});
});
