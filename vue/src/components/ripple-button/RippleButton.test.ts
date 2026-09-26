import { render, screen, cleanup, fireEvent } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import RippleButton from "./RippleButton.vue";
import { sound } from "../../sound/sound.js";

describe("RippleButton", () => {
	afterEach(cleanup);

	it("renders a button element", () => {
		render(RippleButton);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("has overflow-hidden class", () => {
		render(RippleButton);
		const button = screen.getByRole("button");
		expect(button.className).toContain("overflow-hidden");
	});

	it("has rounded-lg class", () => {
		render(RippleButton);
		const button = screen.getByRole("button");
		expect(button.className).toContain("rounded-lg");
	});

	it("sets --ripple-duration CSS custom property", () => {
		render(RippleButton, { props: { duration: 800 } });
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--ripple-duration: 800ms");
	});

	it("applies custom class names", () => {
		render(RippleButton, { props: { class: "my-ripple" } });
		const button = screen.getByRole("button");
		expect(button.className).toContain("my-ripple");
	});

	it("preserves base classes when custom class is added", () => {
		render(RippleButton, { props: { class: "extra" } });
		const button = screen.getByRole("button");
		expect(button.className).toContain("overflow-hidden");
		expect(button.className).toContain("rounded-lg");
	});

	it("forwards native button attributes", () => {
		render(RippleButton, {
			props: { disabled: true },
			attrs: { "aria-label": "Click me" },
		});
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-label", "Click me");
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
			render(RippleButton, { props: { sound: true } });

			await fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			render(RippleButton);

			await fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			render(RippleButton, { props: { sound: true, disabled: true } });
			const button = screen.getByRole("button");

			// Synthetic dispatch bypasses jsdom's native-disabled short-circuit.
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		// The cue is wired into the SAME guarded handleClick that creates the
		// ripple — this proves the per-ripple setTimeout cleanup (which mutates
		// the `ripples` array well after the click) never plays a second cue of
		// its own.
		it("does not play again when the ripple's own cleanup timeout fires", async () => {
			vi.useFakeTimers();
			try {
				render(RippleButton, { props: { sound: true, duration: 50 } });

				await fireEvent.click(screen.getByRole("button"));
				expect(play).toHaveBeenCalledTimes(1);

				vi.advanceTimersByTime(100);

				expect(play).toHaveBeenCalledTimes(1);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	it("keeps two ripples fired within the same millisecond distinct", async () => {
		vi.useFakeTimers();
		try {
			// Pin Date.now() so both clicks land in the same millisecond, the
			// exact collision a wall-clock key would be vulnerable to.
			const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
			try {
				render(RippleButton, { props: { duration: 50 } });
				const button = screen.getByRole("button");

				await fireEvent.click(button);
				vi.advanceTimersByTime(10);
				await fireEvent.click(button);

				expect(button.querySelectorAll(".ripple-animation")).toHaveLength(2);

				// Only the first ripple's cleanup timeout has elapsed (50ms
				// since click 1, 40ms since click 2); a shared key would drop
				// both ripples at once instead of just the first.
				vi.advanceTimersByTime(40);
				await nextTick();
				expect(button.querySelectorAll(".ripple-animation")).toHaveLength(1);

				vi.advanceTimersByTime(10);
				await nextTick();
				expect(button.querySelectorAll(".ripple-animation")).toHaveLength(0);
			} finally {
				dateNowSpy.mockRestore();
			}
		} finally {
			vi.useRealTimers();
		}
	});
});

describe("RippleButton consumer style and slot", () => {
	afterEach(cleanup);

	it("lets a consumer style win a conflicting key (as the Svelte spread does) while keeping --ripple-duration", () => {
		render(RippleButton, {
			props: { duration: 900 },
			attrs: { style: "color: red" },
		});
		const style = screen.getByRole("button").getAttribute("style") ?? "";
		expect(style).toContain("--ripple-duration: 900ms");
		expect(style).toContain("color: red");
	});

	it("gives a conflicting consumer --ripple-duration the last word", () => {
		render(RippleButton, { props: { duration: 900 }, attrs: { style: "--ripple-duration: 50ms" } });
		const style = screen.getByRole("button").getAttribute("style") ?? "";
		expect(style).toContain("--ripple-duration: 50ms");
		expect(style).not.toContain("900ms");
	});

	it("renders the optional default slot", () => {
		render(RippleButton, { slots: { default: "Tap" } });
		expect(screen.getByRole("button").textContent).toContain("Tap");
	});
});
