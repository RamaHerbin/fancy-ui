import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { AnimatedTestimonials } from "./AnimatedTestimonials.js";
import type { Testimonial } from "./AnimatedTestimonials.js";
import { sound, resetSoundForTests } from "../../sound/sound.js";

/** Replaces `window.matchMedia` wholesale — the pattern the rest of the repo
 * uses. The media-query cache is keyed on the current `matchMedia`, so an
 * override installed before a render is visible to the very next read. */
function stubReducedMotion(matches = true): void {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

const testimonials: Testimonial[] = [
	{ quote: "First quote", name: "Alice", designation: "CEO", src: "alice.jpg" },
	{ quote: "Second quote", name: "Bob", designation: "CTO", src: "bob.jpg" },
	{ quote: "Third quote", name: "Carol", designation: "CFO", src: "carol.jpg" },
];

describe("AnimatedTestimonials", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		resetSoundForTests();
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		cleanup();
	});

	it("renders the first testimonial initially", () => {
		const { getByText } = render(<AnimatedTestimonials testimonials={testimonials} />);
		expect(getByText("First quote")).toBeTruthy();
		expect(getByText("Alice")).toBeTruthy();
		expect(getByText("CEO")).toBeTruthy();
	});

	it("shows empty state when testimonials array is empty", () => {
		const { getByText } = render(<AnimatedTestimonials testimonials={[]} />);
		expect(getByText("No testimonials available.")).toBeTruthy();
	});

	it("advances to next testimonial on next button click", () => {
		const { getByLabelText, getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} />
		);
		fireEvent.click(getByLabelText("Next testimonial"));
		act(() => vi.advanceTimersByTime(300));
		expect(getByText("Second quote")).toBeTruthy();
		expect(getByText("Bob")).toBeTruthy();
	});

	it("goes to previous testimonial on prev button click", () => {
		const { getByLabelText, getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} />
		);
		// Go to second first
		fireEvent.click(getByLabelText("Next testimonial"));
		act(() => vi.advanceTimersByTime(300));
		// Then go back
		fireEvent.click(getByLabelText("Previous testimonial"));
		act(() => vi.advanceTimersByTime(300));
		expect(getByText("First quote")).toBeTruthy();
	});

	it("wraps around to last testimonial when going prev from first", () => {
		const { getByLabelText, getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} />
		);
		fireEvent.click(getByLabelText("Previous testimonial"));
		act(() => vi.advanceTimersByTime(300));
		expect(getByText("Third quote")).toBeTruthy();
	});

	it("wraps around to first testimonial when going next from last", () => {
		const { getByLabelText, getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} />
		);
		fireEvent.click(getByLabelText("Next testimonial"));
		act(() => vi.advanceTimersByTime(300));
		fireEvent.click(getByLabelText("Next testimonial"));
		act(() => vi.advanceTimersByTime(300));
		fireEvent.click(getByLabelText("Next testimonial"));
		act(() => vi.advanceTimersByTime(300));
		expect(getByText("First quote")).toBeTruthy();
	});

	it("auto-advances testimonials when autoplay is enabled", () => {
		const { getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} autoplay interval={3000} />
		);
		expect(getByText("First quote")).toBeTruthy();
		act(() => {
			vi.advanceTimersByTime(3000);
			vi.advanceTimersByTime(300);
		});
		expect(getByText("Second quote")).toBeTruthy();
	});

	it("does not auto-advance when autoplay is false", () => {
		const { getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} autoplay={false} interval={1000} />
		);
		act(() => vi.advanceTimersByTime(5000));
		expect(getByText("First quote")).toBeTruthy();
	});

	// Regression: the pending 300ms navigation used to wrap around the length
	// captured when the button was pressed. Shrinking the collection mid-flight
	// then left `activeIndex` past the end of the new list and the card went
	// blank. The wrap reads the live length now, exactly as the Svelte source's
	// reactive prop read does.
	it("wraps around the collection it lands in, not the one it left", () => {
		const { getByLabelText, getByText, rerender } = render(
			<AnimatedTestimonials testimonials={testimonials} />
		);

		// Sit on index 1 so the stale wrap would compute index 2 — one past the
		// end of the two-entry list that replaces this one.
		fireEvent.click(getByLabelText("Next testimonial"));
		act(() => vi.advanceTimersByTime(300));
		expect(getByText("Second quote")).toBeTruthy();

		// Start a navigation, then shrink the list while it is still in flight.
		fireEvent.click(getByLabelText("Next testimonial"));
		rerender(<AnimatedTestimonials testimonials={testimonials.slice(0, 2)} />);
		act(() => vi.advanceTimersByTime(300));

		expect(getByText("First quote")).toBeTruthy();
		expect(getByText("Alice")).toBeTruthy();
	});

	it("renders navigation buttons", () => {
		const { getByLabelText } = render(<AnimatedTestimonials testimonials={testimonials} />);
		expect(getByLabelText("Previous testimonial")).toBeTruthy();
		expect(getByLabelText("Next testimonial")).toBeTruthy();
	});

	it("renders navigation buttons that do not submit a surrounding form", () => {
		const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
		const { getByLabelText } = render(
			<form onSubmit={onSubmit}>
				<AnimatedTestimonials testimonials={testimonials} />
			</form>
		);

		// A <button> with no type is a submit button: pressing "Next" inside a
		// form would post it instead of advancing the carousel.
		expect(getByLabelText("Previous testimonial").getAttribute("type")).toBe("button");
		expect(getByLabelText("Next testimonial").getAttribute("type")).toBe("button");

		fireEvent.click(getByLabelText("Next testimonial"));
		act(() => vi.advanceTimersByTime(300));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("pauses autoplay while a control inside the region holds focus", () => {
		const { getByLabelText, getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} autoplay interval={3000} />
		);

		fireEvent.focus(getByLabelText("Next testimonial"));
		act(() => {
			vi.advanceTimersByTime(3000);
			vi.advanceTimersByTime(300);
		});
		expect(getByText("First quote")).toBeTruthy();

		// Focus leaves the region: the rotation resumes, exactly as it does
		// when the pointer leaves.
		fireEvent.blur(getByLabelText("Next testimonial"));
		act(() => {
			vi.advanceTimersByTime(3000);
			vi.advanceTimersByTime(300);
		});
		expect(getByText("Second quote")).toBeTruthy();
	});

	it("does not autoplay under a reduced-motion preference", () => {
		stubReducedMotion(true);
		const { getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} autoplay interval={3000} />
		);

		// One interval's worth: three testimonials would wrap back to the first
		// after three of them, which would let the assertion pass either way.
		act(() => {
			vi.advanceTimersByTime(3000);
			vi.advanceTimersByTime(300);
		});

		expect(getByText("First quote")).toBeTruthy();
	});

	describe("sound", () => {
		it("plays select exactly once when the Next control moves to another testimonial, with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(
				<AnimatedTestimonials testimonials={testimonials} sound />
			);

			fireEvent.click(getByLabelText("Next testimonial"));
			act(() => vi.advanceTimersByTime(300));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays select exactly once when the Previous control moves to another testimonial, with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(
				<AnimatedTestimonials testimonials={testimonials} sound />
			);

			fireEvent.click(getByLabelText("Previous testimonial"));
			act(() => vi.advanceTimersByTime(300));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(<AnimatedTestimonials testimonials={testimonials} />);

			fireEvent.click(getByLabelText("Next testimonial"));
			act(() => vi.advanceTimersByTime(300));

			expect(play).not.toHaveBeenCalled();
		});

		it("never plays for the autoplay-driven advance — only a user gesture triggers the cue", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(
				<AnimatedTestimonials testimonials={testimonials} sound autoplay interval={3000} />
			);

			act(() => {
				vi.advanceTimersByTime(3000);
				vi.advanceTimersByTime(300);
			});

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing on a rapid second click while a transition is already in flight (isAnimating guard)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(
				<AnimatedTestimonials testimonials={testimonials} sound />
			);
			const next = getByLabelText("Next testimonial");

			fireEvent.click(next);
			// isAnimating is now true, mid-transition; a second click in the same
			// window must be swallowed by the existing early-return, playing nothing.
			fireEvent.click(next);
			act(() => vi.advanceTimersByTime(300));

			expect(play).toHaveBeenCalledTimes(1);
		});

		it("plays nothing for a single-testimonial carousel, which wraps to the same index", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(
				<AnimatedTestimonials testimonials={testimonials.slice(0, 1)} sound />
			);

			fireEvent.click(getByLabelText("Next testimonial"));
			act(() => vi.advanceTimersByTime(300));

			expect(play).not.toHaveBeenCalled();
		});
	});
});
