import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { AnimatedTestimonials } from "./AnimatedTestimonials.js";
import type { Testimonial } from "./AnimatedTestimonials.js";

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
});
