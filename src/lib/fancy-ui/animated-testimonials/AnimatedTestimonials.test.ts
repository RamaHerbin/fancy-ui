import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { flushSync } from "svelte";
import AnimatedTestimonials from "./AnimatedTestimonials.svelte";
import type { Testimonial } from "./AnimatedTestimonials.svelte";

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
});
