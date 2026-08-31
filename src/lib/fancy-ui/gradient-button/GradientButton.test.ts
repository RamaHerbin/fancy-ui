import { render, screen, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import GradientButton from "./GradientButton.svelte";
import { sound } from "../sound/sound.svelte.js";

describe("GradientButton", () => {
	afterEach(cleanup);

	it("renders a button element", () => {
		render(GradientButton);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("applies default CSS custom properties", () => {
		render(GradientButton);
		const button = screen.getByRole("button");
		const style = button.getAttribute("style") ?? "";
		expect(style).toContain("--gb-duration: 2500ms");
		expect(style).toContain("--gb-border-width: 2px");
		expect(style).toContain("--gb-border-radius: 8px");
		expect(style).toContain("--gb-blur: 4px");
		expect(style).toContain("--gb-bg-color: #000");
	});

	it("applies custom colors", () => {
		render(GradientButton, { props: { colors: ["#ff0000", "#00ff00"] } });
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--gb-colors: #ff0000, #00ff00");
	});

	it("applies custom duration", () => {
		render(GradientButton, { props: { duration: 5000 } });
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--gb-duration: 5000ms");
	});

	it("applies custom borderWidth", () => {
		render(GradientButton, { props: { borderWidth: 4 } });
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--gb-border-width: 4px");
	});

	it("applies custom class names", () => {
		render(GradientButton, { props: { class: "my-gradient" } });
		const button = screen.getByRole("button");
		expect(button.className).toContain("my-gradient");
	});

	it("preserves base classes when custom class is added", () => {
		render(GradientButton, { props: { class: "extra" } });
		const button = screen.getByRole("button");
		expect(button.className).toContain("gradient-button");
		expect(button.className).toContain("overflow-hidden");
	});

	it("contains gradient-border span", () => {
		render(GradientButton);
		const button = screen.getByRole("button");
		const border = button.querySelector(".gradient-border");
		expect(border).toBeInTheDocument();
		expect(border).toHaveAttribute("aria-hidden", "true");
	});

	it("contains gradient-content span", () => {
		render(GradientButton);
		const button = screen.getByRole("button");
		const content = button.querySelector(".gradient-content");
		expect(content).toBeInTheDocument();
	});

	it("forwards native button attributes", () => {
		render(GradientButton, { props: { disabled: true, type: "submit" } });
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("type", "submit");
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays the press cue exactly once when sound is enabled and the button is clicked", async () => {
			render(GradientButton, { props: { sound: true } });

			await fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			render(GradientButton);

			await fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			render(GradientButton, { props: { sound: true, disabled: true } });
			const button = screen.getByRole("button");

			// Synthetic dispatch bypasses jsdom's own native-disabled short-circuit,
			// proving the guard is the JS `restProps.disabled` check, not the
			// browser's default handling of a real click.
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("forwards a consumer onclick alongside the cue instead of the spread onclick silently overwriting handleClick", async () => {
			const onclick = vi.fn();
			render(GradientButton, { props: { sound: true, onclick } });

			await fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
			expect(onclick).toHaveBeenCalledTimes(1);
		});
	});
});
