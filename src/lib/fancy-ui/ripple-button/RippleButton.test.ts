import { render, screen, cleanup, fireEvent } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import RippleButton, { rippleGeometry } from "./RippleButton.svelte";
import { sound } from "../sound/sound.svelte.js";

describe("RippleButton", () => {
	afterEach(cleanup);

	it("grows a ripple from the pointer, wide enough to reach the farthest corner", () => {
		const rect = { left: 100, top: 50, width: 200, height: 40 };
		const g = rippleGeometry(rect, { clientX: 130, clientY: 70, detail: 1 });
		// centre at (30, 20) inside the button; farthest corner is (200, 40)
		const reach = Math.hypot(170, 20);
		expect(g.size).toBeCloseTo(2 * reach, 6);
		expect(g.x + g.size / 2).toBeCloseTo(30, 6);
		expect(g.y + g.size / 2).toBeCloseTo(20, 6);
	});

	it("starts a keyboard-triggered ripple from the centre", () => {
		const rect = { left: 100, top: 50, width: 200, height: 40 };
		const g = rippleGeometry(rect, { clientX: 0, clientY: 0, detail: 0 });
		expect(g.x + g.size / 2).toBeCloseTo(100, 6);
		expect(g.y + g.size / 2).toBeCloseTo(20, 6);
	});

	it("exposes the ripple colour and marks the button while a ripple runs", async () => {
		vi.useFakeTimers();
		try {
			render(RippleButton, { props: { rippleColor: "#ff00aa", duration: 500 } });
			const button = screen.getByRole("button");
			expect(button.getAttribute("style")).toContain("--ripple-color: #ff00aa");
			expect(button.hasAttribute("data-rippling")).toBe(false);
			await fireEvent.click(button);
			flushSync();
			expect(button.hasAttribute("data-rippling")).toBe(true);
			vi.advanceTimersByTime(500);
			flushSync();
			expect(button.hasAttribute("data-rippling")).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("tracks the pointer for the hover glow and forwards a consumer onpointermove", async () => {
		const onpointermove = vi.fn();
		render(RippleButton, { props: { onpointermove } });
		const button = screen.getByRole("button");
		button.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 40 }) as DOMRect;
		await fireEvent.pointerMove(button, { clientX: 60, clientY: 30 });
		expect(button.style.getPropertyValue("--ripple-x")).toBe("50px");
		expect(button.style.getPropertyValue("--ripple-y")).toBe("10px");
		expect(onpointermove).toHaveBeenCalledTimes(1);
		const hover = button.querySelector(".ripple-hover");
		expect(hover).toBeInTheDocument();
		expect(hover).toHaveAttribute("aria-hidden", "true");
	});

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
			props: { disabled: true, "aria-label": "Click me" },
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
			// exact collision a wall-clock key is vulnerable to.
			const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
			try {
				render(RippleButton, { props: { duration: 50 } });
				const button = screen.getByRole("button");

				await fireEvent.click(button);
				vi.advanceTimersByTime(10);
				await fireEvent.click(button);

				// With a colliding key, Svelte's keyed #each throws
				// each_key_duplicate here instead of rendering both spans.
				expect(button.querySelectorAll(".ripple-animation")).toHaveLength(2);

				// Only the first ripple's cleanup timeout has elapsed (50ms
				// since click 1, 40ms since click 2); a shared key would drop
				// both ripples at once instead of just the first.
				vi.advanceTimersByTime(40);
				flushSync();
				expect(button.querySelectorAll(".ripple-animation")).toHaveLength(1);

				vi.advanceTimersByTime(10);
				flushSync();
				expect(button.querySelectorAll(".ripple-animation")).toHaveLength(0);
			} finally {
				dateNowSpy.mockRestore();
			}
		} finally {
			vi.useRealTimers();
		}
	});
});
