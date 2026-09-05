import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { RainbowButton } from "./RainbowButton.js";
import { sound } from "../../sound/sound.js";

describe("RainbowButton", () => {
	afterEach(cleanup);

	it("renders a button element by default", () => {
		render(<RainbowButton />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("renders an anchor element when href is provided", () => {
		render(<RainbowButton href="/test" />);
		expect(screen.getByRole("link")).toBeInTheDocument();
	});

	it("applies the href to the anchor element", () => {
		render(<RainbowButton href="/test" />);
		expect(screen.getByRole("link")).toHaveAttribute("href", "/test");
	});

	it("sets the --rainbow-speed CSS custom property", () => {
		render(<RainbowButton speed={5} />);
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--rainbow-speed: 5s");
	});

	it("uses default speed of 2s", () => {
		render(<RainbowButton />);
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--rainbow-speed: 2s");
	});

	it("applies custom class names", () => {
		render(<RainbowButton className="my-custom" />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("my-custom");
	});

	it("preserves base classes when custom class is added", () => {
		render(<RainbowButton className="extra" />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("rainbow-button");
		expect(button.className).toContain("rounded-xl");
	});

	it("supports disabled state on button", () => {
		render(<RainbowButton disabled />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it('sets type="button" by default', () => {
		render(<RainbowButton />);
		expect(screen.getByRole("button")).toHaveAttribute("type", "button");
	});

	it("allows custom type attribute", () => {
		render(<RainbowButton type="submit" />);
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays the press cue exactly once when sound is enabled and the button is clicked", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<RainbowButton sound />);

			fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<RainbowButton />);

			fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<RainbowButton sound disabled />);
			const button = screen.getByRole("button");

			// Synthetic dispatch bypasses jsdom's native-disabled short-circuit.
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		// The anchor branch has no native `disabled` attribute at all — only
		// `aria-disabled` — so the JS `if (disabled) return;` guard in
		// handleClick is the ONLY thing keeping a disabled link silent. This
		// proves that guard actually runs on the anchor branch, not just the
		// button branch.
		it("plays nothing on a disabled anchor, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<RainbowButton sound disabled href="/pricing" />);
			const link = screen.getByRole("link");

			link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		// handleClick is bound separately on both render branches — this proves
		// the anchor branch actually plays the cue too, not just the button.
		it("plays the press cue on an enabled anchor as well as the button", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<RainbowButton sound href="/pricing" />);

			fireEvent.click(screen.getByRole("link"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});
	});
});
