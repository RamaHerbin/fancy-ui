import { render, screen, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import ShimmerButton from "./ShimmerButton.svelte";
import { sound } from "../sound/sound.svelte.js";

describe("ShimmerButton", () => {
	afterEach(cleanup);

	it("renders a button element", () => {
		render(ShimmerButton);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("applies default CSS custom properties", () => {
		render(ShimmerButton);
		const button = screen.getByRole("button");
		const style = button.getAttribute("style") ?? "";
		expect(style).toContain("--shimmer-color: #ffffff");
		expect(style).toContain("--speed: 3s");
		expect(style).toContain("--bg: rgba(0, 0, 0, 1)");
	});

	it("applies custom shimmerColor", () => {
		render(ShimmerButton, { props: { shimmerColor: "#ff0000" } });
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--shimmer-color: #ff0000");
	});

	it("applies custom background", () => {
		render(ShimmerButton, { props: { background: "rgba(0, 0, 255, 0.5)" } });
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--bg: rgba(0, 0, 255, 0.5)");
	});

	it("applies custom shimmerDuration", () => {
		render(ShimmerButton, { props: { shimmerDuration: "5s" } });
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--speed: 5s");
	});

	it("applies custom borderRadius", () => {
		render(ShimmerButton, { props: { borderRadius: "8px" } });
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--radius: 8px");
	});

	it("applies custom class names", () => {
		render(ShimmerButton, { props: { class: "my-shimmer" } });
		const button = screen.getByRole("button");
		expect(button.className).toContain("my-shimmer");
	});

	it("preserves base classes when custom class is added", () => {
		render(ShimmerButton, { props: { class: "extra" } });
		const button = screen.getByRole("button");
		expect(button.className).toContain("shimmer-button");
		expect(button.className).toContain("overflow-hidden");
	});

	it("contains shimmer layer div", () => {
		render(ShimmerButton);
		const button = screen.getByRole("button");
		const shimmerLayer = button.querySelector(".shimmer-slide");
		expect(shimmerLayer).toBeInTheDocument();
	});

	it("contains spin-around element", () => {
		render(ShimmerButton);
		const button = screen.getByRole("button");
		const spinAround = button.querySelector(".spin-around");
		expect(spinAround).toBeInTheDocument();
	});

	it("forwards native button attributes", () => {
		render(ShimmerButton, {
			props: { disabled: true, "aria-label": "Submit" },
		});
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-label", "Submit");
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
			render(ShimmerButton, { props: { sound: true } });

			await fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			render(ShimmerButton);

			await fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			render(ShimmerButton, { props: { sound: true, disabled: true } });
			const button = screen.getByRole("button");

			// Synthetic dispatch bypasses jsdom's native-disabled short-circuit,
			// proving the guard is the JS `restProps.disabled` check.
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("forwards a consumer onclick alongside the cue instead of the spread onclick silently overwriting handleClick", async () => {
			const onclick = vi.fn();
			render(ShimmerButton, { props: { sound: true, onclick } });

			await fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
			expect(onclick).toHaveBeenCalledTimes(1);
		});
	});
});
