import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { flushSync } from "svelte";
import AnimatedTestimonials from "./AnimatedTestimonials.svelte";
import type { Testimonial } from "./AnimatedTestimonials.svelte";
import { sound } from "../sound/sound.svelte.js";

const testimonials: Testimonial[] = [
	{ quote: "First quote", name: "Alice", designation: "CEO", src: "alice.jpg" },
	{ quote: "Second quote", name: "Bob", designation: "CTO", src: "bob.jpg" },
	{ quote: "Third quote", name: "Carol", designation: "CFO", src: "carol.jpg" },
];

describe("AnimatedTestimonials", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		cleanup();
	});

	it("renders the first testimonial initially", () => {
		const { getByText } = render(AnimatedTestimonials, { props: { testimonials } });
		expect(getByText("First quote")).toBeTruthy();
		expect(getByText("Alice")).toBeTruthy();
		expect(getByText("CEO")).toBeTruthy();
	});

	it("shows empty state when testimonials array is empty", () => {
		const { getByText } = render(AnimatedTestimonials, { props: { testimonials: [] } });
		expect(getByText("No testimonials available.")).toBeTruthy();
	});

	it("advances to next testimonial on next button click", () => {
		const { getByLabelText, getByText } = render(AnimatedTestimonials, {
			props: { testimonials },
		});
		fireEvent.click(getByLabelText("Next testimonial"));
		flushSync(() => vi.advanceTimersByTime(300));
		expect(getByText("Second quote")).toBeTruthy();
		expect(getByText("Bob")).toBeTruthy();
	});

	it("goes to previous testimonial on prev button click", () => {
		const { getByLabelText, getByText } = render(AnimatedTestimonials, {
			props: { testimonials },
		});
		// Go to second first
		fireEvent.click(getByLabelText("Next testimonial"));
		flushSync(() => vi.advanceTimersByTime(300));
		// Then go back
		fireEvent.click(getByLabelText("Previous testimonial"));
		flushSync(() => vi.advanceTimersByTime(300));
		expect(getByText("First quote")).toBeTruthy();
	});

	it("wraps around to last testimonial when going prev from first", () => {
		const { getByLabelText, getByText } = render(AnimatedTestimonials, {
			props: { testimonials },
		});
		fireEvent.click(getByLabelText("Previous testimonial"));
		flushSync(() => vi.advanceTimersByTime(300));
		expect(getByText("Third quote")).toBeTruthy();
	});

	it("wraps around to first testimonial when going next from last", () => {
		const { getByLabelText, getByText } = render(AnimatedTestimonials, {
			props: { testimonials },
		});
		fireEvent.click(getByLabelText("Next testimonial"));
		flushSync(() => vi.advanceTimersByTime(300));
		fireEvent.click(getByLabelText("Next testimonial"));
		flushSync(() => vi.advanceTimersByTime(300));
		fireEvent.click(getByLabelText("Next testimonial"));
		flushSync(() => vi.advanceTimersByTime(300));
		expect(getByText("First quote")).toBeTruthy();
	});

	it("auto-advances testimonials when autoplay is enabled", () => {
		const { getByText } = render(AnimatedTestimonials, {
			props: { testimonials, autoplay: true, interval: 3000 },
		});
		expect(getByText("First quote")).toBeTruthy();
		flushSync(() => {
			vi.advanceTimersByTime(3000);
			vi.advanceTimersByTime(300);
		});
		expect(getByText("Second quote")).toBeTruthy();
	});

	it("does not auto-advance when autoplay is false", () => {
		const { getByText } = render(AnimatedTestimonials, {
			props: { testimonials, autoplay: false, interval: 1000 },
		});
		vi.advanceTimersByTime(5000);
		expect(getByText("First quote")).toBeTruthy();
	});

	it("renders navigation buttons", () => {
		const { getByLabelText } = render(AnimatedTestimonials, { props: { testimonials } });
		expect(getByLabelText("Previous testimonial")).toBeTruthy();
		expect(getByLabelText("Next testimonial")).toBeTruthy();
	});

	it("sets type=\"button\" on the nav buttons so they never submit a surrounding form", () => {
		const { getByLabelText } = render(AnimatedTestimonials, { props: { testimonials } });
		expect(getByLabelText("Previous testimonial").getAttribute("type")).toBe("button");
		expect(getByLabelText("Next testimonial").getAttribute("type")).toBe("button");
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays select exactly once when the Next control moves to another testimonial, with sound enabled", () => {
			const { getByLabelText } = render(AnimatedTestimonials, {
				props: { testimonials, sound: true },
			});

			fireEvent.click(getByLabelText("Next testimonial"));
			flushSync(() => vi.advanceTimersByTime(300));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays select exactly once when the Previous control moves to another testimonial, with sound enabled", () => {
			const { getByLabelText } = render(AnimatedTestimonials, {
				props: { testimonials, sound: true },
			});

			fireEvent.click(getByLabelText("Previous testimonial"));
			flushSync(() => vi.advanceTimersByTime(300));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const { getByLabelText } = render(AnimatedTestimonials, { props: { testimonials } });

			fireEvent.click(getByLabelText("Next testimonial"));
			flushSync(() => vi.advanceTimersByTime(300));

			expect(play).not.toHaveBeenCalled();
		});

		it("never plays for the autoplay-driven advance — only a user gesture triggers the cue", () => {
			render(AnimatedTestimonials, {
				props: { testimonials, sound: true, autoplay: true, interval: 3000 },
			});

			flushSync(() => {
				vi.advanceTimersByTime(3000);
				vi.advanceTimersByTime(300);
			});

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing on a rapid second click while a transition is already in flight (isAnimating guard)", () => {
			const { getByLabelText } = render(AnimatedTestimonials, {
				props: { testimonials, sound: true },
			});
			const next = getByLabelText("Next testimonial");

			fireEvent.click(next);
			flushSync();
			// isAnimating is now true, mid-transition; a second click in the same
			// window must be swallowed by the existing early-return, playing nothing.
			fireEvent.click(next);
			flushSync(() => vi.advanceTimersByTime(300));

			expect(play).toHaveBeenCalledTimes(1);
		});

		it("plays nothing for a single-testimonial carousel, which wraps to the same index", () => {
			const { getByLabelText } = render(AnimatedTestimonials, {
				props: { testimonials: [testimonials[0]], sound: true },
			});

			fireEvent.click(getByLabelText("Next testimonial"));
			flushSync(() => vi.advanceTimersByTime(300));

			expect(play).not.toHaveBeenCalled();
		});
	});
});
