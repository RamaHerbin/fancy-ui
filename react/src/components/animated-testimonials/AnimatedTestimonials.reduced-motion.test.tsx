import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { AnimatedTestimonials } from "./AnimatedTestimonials.js";
import type { Testimonial } from "./AnimatedTestimonials.js";

function mockMatchMedia(reduce: boolean) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: reduce && query.includes("reduce") && !query.includes("no-preference"),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		}),
	});
}

const testimonials: Testimonial[] = [
	{ quote: "First quote", name: "Alice", designation: "CEO", src: "alice.jpg" },
	{ quote: "Second quote", name: "Bob", designation: "CTO", src: "bob.jpg" },
	{ quote: "Third quote", name: "Carol", designation: "CFO", src: "carol.jpg" },
];

describe("AnimatedTestimonials reduced motion", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		cleanup();
	});

	/** One interval plus the 300 ms slide: enough to move one testimonial. */
	function advanceOneCycle() {
		act(() => {
			vi.advanceTimersByTime(3000);
			vi.advanceTimersByTime(300);
		});
	}

	it("autoplays with no preference", () => {
		mockMatchMedia(false);
		const { getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} autoplay interval={3000} />
		);
		advanceOneCycle();
		expect(getByText("Second quote")).toBeTruthy();
	});

	it("does not autoplay under reduce", () => {
		mockMatchMedia(true);
		const { getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} autoplay interval={3000} />
		);
		advanceOneCycle();
		expect(getByText("First quote")).toBeTruthy();
	});

	it("still navigates by hand under reduce", () => {
		mockMatchMedia(true);
		const { getByLabelText, getByText } = render(
			<AnimatedTestimonials testimonials={testimonials} />
		);
		fireEvent.click(getByLabelText("Next testimonial"));
		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(getByText("Second quote")).toBeTruthy();
	});

	it("keeps the slide durations out of inline styles", () => {
		mockMatchMedia(true);
		const { container } = render(<AnimatedTestimonials testimonials={testimonials} />);
		for (const el of container.querySelectorAll("[style]")) {
			expect(el.getAttribute("style") ?? "").not.toMatch(/transition/);
		}
		const slides = container.querySelectorAll(".motion-safe\\:transition-all");
		expect(slides.length).toBe(testimonials.length);
		for (const slide of slides) expect(slide.className).toContain("motion-safe:duration-300");
	});
});
