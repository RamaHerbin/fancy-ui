import { act, render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { RippleButton, rippleGeometry } from "./RippleButton.js";
import { resetSoundForTests, sound } from "../../sound/sound.js";

function ripples(container: HTMLElement): NodeListOf<HTMLElement> {
	return container.querySelectorAll<HTMLElement>(".ripple-animation");
}

// jsdom ships no PointerEvent, so a `pointermove` built from it drops the
// coordinates; a MouseEvent of that type carries them to React's listener.
function pointerMove(target: HTMLElement, clientX: number, clientY: number) {
	act(() => {
		target.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX, clientY }));
	});
}

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

	it("exposes the ripple colour and marks the button while a ripple runs", () => {
		vi.useFakeTimers();
		try {
			render(<RippleButton rippleColor="#ff00aa" duration={500} />);
			const button = screen.getByRole("button");
			expect(button.getAttribute("style")).toContain("--ripple-color: #ff00aa");
			expect(button.hasAttribute("data-rippling")).toBe(false);
			fireEvent.click(button);
			expect(button.hasAttribute("data-rippling")).toBe(true);
			act(() => {
				vi.advanceTimersByTime(500);
			});
			expect(button.hasAttribute("data-rippling")).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("tracks the pointer for the hover glow and forwards a consumer onPointerMove", () => {
		const onPointerMove = vi.fn();
		render(<RippleButton onPointerMove={onPointerMove} />);
		const button = screen.getByRole("button");
		button.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 40 }) as DOMRect;
		pointerMove(button, 60, 30);
		expect(button.style.getPropertyValue("--ripple-x")).toBe("50px");
		expect(button.style.getPropertyValue("--ripple-y")).toBe("10px");
		expect(onPointerMove).toHaveBeenCalledTimes(1);
		const hover = button.querySelector(".ripple-hover");
		expect(hover).toBeInTheDocument();
		expect(hover).toHaveAttribute("aria-hidden", "true");
	});

	it("keeps the pointer position across a ripple re-render", () => {
		render(<RippleButton />);
		const button = screen.getByRole("button");
		button.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 40 }) as DOMRect;
		pointerMove(button, 60, 30);
		fireEvent.click(button, { clientX: 60, clientY: 30 });
		expect(button.style.getPropertyValue("--ripple-x")).toBe("50px");
		expect(button.style.getPropertyValue("--ripple-y")).toBe("10px");
	});

	it("renders a button element", () => {
		render(<RippleButton />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("has overflow-hidden class", () => {
		render(<RippleButton />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("overflow-hidden");
	});

	it("has rounded-lg class", () => {
		render(<RippleButton />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("rounded-lg");
	});

	it("sets --ripple-duration CSS custom property", () => {
		render(<RippleButton duration={800} />);
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--ripple-duration: 800ms");
	});

	it("applies custom class names", () => {
		render(<RippleButton className="my-ripple" />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("my-ripple");
	});

	it("preserves base classes when custom class is added", () => {
		render(<RippleButton className="extra" />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("overflow-hidden");
		expect(button.className).toContain("rounded-lg");
	});

	it("forwards native button attributes", () => {
		render(<RippleButton disabled aria-label="Click me" />);
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-label", "Click me");
	});

	it("does not spread the sound prop onto the button element", () => {
		render(<RippleButton sound />);
		expect(screen.getByRole("button")).not.toHaveAttribute("sound");
	});

	describe("ripples", () => {
		// Two clicks inside one millisecond used to mint the same key. React
		// warned about the duplicate, and the first expiring timeout's filter
		// — which matches on the key — dropped BOTH ripples, cutting the second
		// animation short. The key is a monotonic counter, so two ripples are
		// distinct however close together they land. `Date.now` is pinned to
		// reproduce that millisecond deterministically.
		it("gives two clicks in the same millisecond distinct keys", () => {
			const error = vi.spyOn(console, "error").mockImplementation(() => {});
			vi.spyOn(Date, "now").mockReturnValue(1_000);
			try {
				const { container } = render(<RippleButton />);
				const button = screen.getByRole("button");

				fireEvent.click(button);
				fireEvent.click(button);

				expect(ripples(container)).toHaveLength(2);
				expect(error.mock.calls.some((args) => String(args[0]).includes("same key"))).toBe(false);
			} finally {
				vi.restoreAllMocks();
			}
		});

		it("removes only the ripple whose own timeout fired", () => {
			vi.useFakeTimers();
			vi.spyOn(Date, "now").mockReturnValue(1_000);
			try {
				const { container } = render(<RippleButton duration={100} />);
				const button = screen.getByRole("button");

				fireEvent.click(button);
				act(() => {
					vi.advanceTimersByTime(50);
				});
				fireEvent.click(button);
				expect(ripples(container)).toHaveLength(2);

				// t = 100: the first ripple's own timeout, and only that one.
				act(() => {
					vi.advanceTimersByTime(50);
				});
				expect(ripples(container)).toHaveLength(1);

				// t = 150: the second's.
				act(() => {
					vi.advanceTimersByTime(50);
				});
				expect(ripples(container)).toHaveLength(0);
			} finally {
				vi.restoreAllMocks();
				vi.useRealTimers();
			}
		});
	});

	describe("ref", () => {
		// The button used to be wired through an inline arrow rebuilt on every
		// render, so each ripple push and expiry detached the consumer's ref
		// with `null` and re-attached it. The composed ref's identity changes
		// only when the incoming ref does.
		it("does not detach the consumer's callback ref when a ripple renders", () => {
			const calls: Array<HTMLButtonElement | null> = [];
			const ref = (node: HTMLButtonElement | null) => {
				calls.push(node);
			};

			render(<RippleButton ref={ref} />);
			expect(calls).toHaveLength(1);
			expect(calls[0]).toBeInstanceOf(HTMLButtonElement);

			fireEvent.click(screen.getByRole("button"));

			expect(calls).toHaveLength(1);
			expect(calls).not.toContain(null);
		});

		it("runs a callback ref's returned cleanup on unmount", () => {
			const teardown = vi.fn();
			const { unmount } = render(<RippleButton ref={() => teardown} />);

			expect(teardown).not.toHaveBeenCalled();

			unmount();

			expect(teardown).toHaveBeenCalledTimes(1);
		});
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
			render(<RippleButton sound />);

			fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<RippleButton />);

			fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<RippleButton sound disabled />);
			const button = screen.getByRole("button");

			// Synthetic dispatch bypasses jsdom's native-disabled short-circuit.
			// React's own event system refuses mouse listeners on a disabled
			// button as well, so this pins the outcome from both directions:
			// the handler's `disabled` guard and React's delegation.
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
			expect(ripples(container)).toHaveLength(0);
		});

		// The cue is wired into the SAME guarded handleClick that creates the
		// ripple — this proves the per-ripple setTimeout cleanup (which mutates
		// the `ripples` array well after the click) never plays a second cue of
		// its own.
		it("does not play again when the ripple's own cleanup timeout fires", () => {
			vi.useFakeTimers();
			try {
				const play = vi.spyOn(sound, "play").mockImplementation(() => {});
				render(<RippleButton sound duration={50} />);

				fireEvent.click(screen.getByRole("button"));
				expect(play).toHaveBeenCalledTimes(1);

				act(() => {
					vi.advanceTimersByTime(100);
				});

				expect(play).toHaveBeenCalledTimes(1);
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
