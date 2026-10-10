import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import AnimatedTestimonials from "./AnimatedTestimonials.vue";
import type { Testimonial } from "./AnimatedTestimonials.vue";
import { sound } from "../../sound/sound.js";

const testimonials: Testimonial[] = [
	{ quote: "First quote", name: "Alice", designation: "CEO", src: "alice.jpg" },
	{ quote: "Second quote", name: "Bob", designation: "CTO", src: "bob.jpg" },
	{ quote: "Third quote", name: "Carol", designation: "CFO", src: "carol.jpg" },
];

async function advance(ms: number) {
	vi.advanceTimersByTime(ms);
	await nextTick();
}

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

	it("advances to next testimonial on next button click", async () => {
		const { getByLabelText, getByText } = render(AnimatedTestimonials, {
			props: { testimonials },
		});
		await fireEvent.click(getByLabelText("Next testimonial"));
		await advance(300);
		expect(getByText("Second quote")).toBeTruthy();
		expect(getByText("Bob")).toBeTruthy();
	});

	it("goes to previous testimonial on prev button click", async () => {
		const { getByLabelText, getByText } = render(AnimatedTestimonials, {
			props: { testimonials },
		});
		// Go to second first
		await fireEvent.click(getByLabelText("Next testimonial"));
		await advance(300);
		// Then go back
		await fireEvent.click(getByLabelText("Previous testimonial"));
		await advance(300);
		expect(getByText("First quote")).toBeTruthy();
	});

	it("wraps around to last testimonial when going prev from first", async () => {
		const { getByLabelText, getByText } = render(AnimatedTestimonials, {
			props: { testimonials },
		});
		await fireEvent.click(getByLabelText("Previous testimonial"));
		await advance(300);
		expect(getByText("Third quote")).toBeTruthy();
	});

	it("wraps around to first testimonial when going next from last", async () => {
		const { getByLabelText, getByText } = render(AnimatedTestimonials, {
			props: { testimonials },
		});
		await fireEvent.click(getByLabelText("Next testimonial"));
		await advance(300);
		await fireEvent.click(getByLabelText("Next testimonial"));
		await advance(300);
		await fireEvent.click(getByLabelText("Next testimonial"));
		await advance(300);
		expect(getByText("First quote")).toBeTruthy();
	});

	it("auto-advances testimonials when autoplay is enabled", async () => {
		const { getByText } = render(AnimatedTestimonials, {
			props: { testimonials, autoplay: true, interval: 3000 },
		});
		expect(getByText("First quote")).toBeTruthy();
		await advance(3000);
		await advance(300);
		expect(getByText("Second quote")).toBeTruthy();
	});

	it("does not auto-advance when autoplay is false", async () => {
		const { getByText } = render(AnimatedTestimonials, {
			props: { testimonials, autoplay: false, interval: 1000 },
		});
		await advance(5000);
		expect(getByText("First quote")).toBeTruthy();
	});

	it("renders navigation buttons", () => {
		const { getByLabelText } = render(AnimatedTestimonials, { props: { testimonials } });
		expect(getByLabelText("Previous testimonial")).toBeTruthy();
		expect(getByLabelText("Next testimonial")).toBeTruthy();
	});

	it('sets type="button" on the nav buttons so they never submit a surrounding form', () => {
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

		it("plays select exactly once when the Next control moves to another testimonial, with sound enabled", async () => {
			const { getByLabelText } = render(AnimatedTestimonials, {
				props: { testimonials, sound: true },
			});

			await fireEvent.click(getByLabelText("Next testimonial"));
			await advance(300);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays select exactly once when the Previous control moves to another testimonial, with sound enabled", async () => {
			const { getByLabelText } = render(AnimatedTestimonials, {
				props: { testimonials, sound: true },
			});

			await fireEvent.click(getByLabelText("Previous testimonial"));
			await advance(300);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { getByLabelText } = render(AnimatedTestimonials, { props: { testimonials } });

			await fireEvent.click(getByLabelText("Next testimonial"));
			await advance(300);

			expect(play).not.toHaveBeenCalled();
		});

		it("never plays for the autoplay-driven advance — only a user gesture triggers the cue", async () => {
			render(AnimatedTestimonials, {
				props: { testimonials, sound: true, autoplay: true, interval: 3000 },
			});

			await advance(3000);
			await advance(300);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing on a rapid second click while a transition is already in flight (isAnimating guard)", async () => {
			const { getByLabelText } = render(AnimatedTestimonials, {
				props: { testimonials, sound: true },
			});
			const next = getByLabelText("Next testimonial");

			await fireEvent.click(next);
			await nextTick();
			// isAnimating is now true, mid-transition; a second click in the same
			// window must be swallowed by the existing early-return, playing nothing.
			await fireEvent.click(next);
			await advance(300);

			expect(play).toHaveBeenCalledTimes(1);
		});

		it("plays nothing for a single-testimonial carousel, which wraps to the same index", async () => {
			const { getByLabelText } = render(AnimatedTestimonials, {
				props: { testimonials: testimonials.slice(0, 1), sound: true },
			});

			await fireEvent.click(getByLabelText("Next testimonial"));
			await advance(300);

			expect(play).not.toHaveBeenCalled();
		});
	});

	// Upstream fix (PR #262 review): the active index follows a list that
	// shrinks or empties after mount instead of rendering blank or going NaN.
	describe("testimonials prop changes after mount", () => {
		it("clamps the active testimonial when the list shrinks below it", async () => {
			const { getByLabelText, getByText, rerender } = render(AnimatedTestimonials, {
				props: { testimonials },
			});
			await fireEvent.click(getByLabelText("Previous testimonial"));
			await advance(300);
			expect(getByText("Third quote")).toBeTruthy();

			await rerender({ testimonials: testimonials.slice(0, 2) });
			await nextTick();
			expect(getByText("Second quote")).toBeTruthy();
			expect(getByText("Bob")).toBeTruthy();
		});

		it("recovers when the list empties during a transition and is repopulated", async () => {
			const { getByLabelText, getByText, rerender } = render(AnimatedTestimonials, {
				props: { testimonials },
			});
			await fireEvent.click(getByLabelText("Next testimonial"));
			await rerender({ testimonials: [] });
			await advance(300);
			expect(getByText("No testimonials available.")).toBeTruthy();

			await rerender({ testimonials });
			await nextTick();
			expect(getByText("First quote")).toBeTruthy();
			await fireEvent.click(getByLabelText("Next testimonial"));
			await advance(300);
			expect(getByText("Second quote")).toBeTruthy();
		});
	});

	// Beyond the Svelte suite: the autoplay effect never runs during a server
	// render in Svelte, and a server-scheduled interval would never be cleared.
	describe("ssr", () => {
		beforeEach(() => {
			vi.useRealTimers();
		});

		it("schedules no autoplay interval on the server", async () => {
			const schedule = vi.spyOn(globalThis, "setInterval");

			await renderToString(
				createSSRApp(AnimatedTestimonials, { testimonials, autoplay: true, interval: 10 })
			);

			expect(schedule).not.toHaveBeenCalled();
			schedule.mockRestore();
		});

		it("renders identically twice on the server", async () => {
			const first = await renderToString(createSSRApp(AnimatedTestimonials, { testimonials }));
			const second = await renderToString(createSSRApp(AnimatedTestimonials, { testimonials }));

			expect(first).toBe(second);
		});
	});
});
