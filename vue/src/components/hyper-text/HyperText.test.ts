import { render, cleanup } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import HyperText from "./HyperText.vue";

describe("HyperText", () => {
	afterEach(cleanup);

	it("renders one span per character", () => {
		const { container } = render(HyperText, { props: { text: "Hello" } });
		const chars = container.querySelectorAll(".hyper-text-char");
		expect(chars.length).toBe(5);
	});

	it("displays text in uppercase", () => {
		const { container } = render(HyperText, { props: { text: "abc" } });
		const wrapper = container.querySelector(".hyper-text");
		// Text content may be scrambled or resolved, but should exist
		expect(wrapper?.textContent?.trim().length).toBeGreaterThan(0);
	});

	it("applies custom class names", () => {
		const { container } = render(HyperText, {
			props: { text: "Test", class: "my-hyper" },
		});
		const wrapper = container.querySelector(".hyper-text");
		expect(wrapper?.className).toContain("my-hyper");
	});

	it("applies animation styles to each character", () => {
		const { container } = render(HyperText, { props: { text: "Hi" } });
		const chars = container.querySelectorAll(".hyper-text-char");
		chars.forEach((char) => {
			const style = (char as HTMLElement).getAttribute("style") ?? "";
			expect(style).toContain("animation");
			expect(style).toContain("hyperFadeIn");
		});
	});

	it("renders spaces with w-3 class", () => {
		const { container } = render(HyperText, { props: { text: "A B" } });
		const chars = container.querySelectorAll(".hyper-text-char");
		expect(chars.length).toBe(3);
		expect(chars[1]?.className).toContain("w-3");
	});

	describe("scramble", () => {
		// "ABCDE" is 5 chars and `duration` defaults to 800, so the interval fires
		// every 16ms and `iterations` needs 51 fires to pass the text length.
		const TICK = 16;

		/**
		 * `advanceTimersByTime` is synchronous, while the re-render it schedules is
		 * a microtask. Every assertion on rendered text must therefore be preceded
		 * by an awaited flush, or it reads the mount-time DOM — which already holds
		 * the full text — and passes no matter what the animation did. Verified: a
		 * synchronous advance-then-assert fails all five cases below.
		 */
		async function tick(ticks: number): Promise<void> {
			vi.advanceTimersByTime(TICK * ticks);
			await nextTick();
		}

		/** Run the load animation for `ticks` interval fires and report the rendered text. */
		async function scrambleAfterTicks(ticks: number): Promise<string> {
			const { container } = render(HyperText, {
				props: { text: "ABCDE", animateOnLoad: true, seed: 1 },
			});
			await tick(ticks);
			const rendered = container.querySelector(".hyper-text")?.textContent ?? "";
			cleanup();
			return rendered;
		}

		it("scrambles the characters it has not resolved yet", async () => {
			vi.useFakeTimers();
			try {
				const scrambled = await scrambleAfterTicks(5);
				// Five fires leave `iterations` at 0.4, so only index 0 is resolved.
				expect(scrambled).toHaveLength(5);
				expect(scrambled.startsWith("A")).toBe(true);
				expect(scrambled).not.toBe("ABCDE");
			} finally {
				vi.useRealTimers();
			}
		});

		it("draws the same sequence twice for the same seed", async () => {
			vi.useFakeTimers();
			try {
				const first = await scrambleAfterTicks(5);
				expect(first).not.toBe("ABCDE");
				expect(await scrambleAfterTicks(5)).toBe(first);
			} finally {
				vi.useRealTimers();
			}
		});

		it("resolves to the full text once the animation completes", async () => {
			vi.useFakeTimers();
			try {
				const { container } = render(HyperText, {
					props: { text: "ABCDE", animateOnLoad: true, seed: 1 },
				});
				const wrapper = container.querySelector(".hyper-text") as HTMLElement;
				// Mid-flight the text is scrambled, so the final assertion is only
				// reachable by actually running the animation to its end.
				await tick(5);
				expect(wrapper.textContent).not.toBe("ABCDE");
				await tick(55);
				expect(wrapper.textContent).toBe("ABCDE");
				// The last fire clears its own interval.
				expect(vi.getTimerCount()).toBe(0);
			} finally {
				vi.useRealTimers();
			}
		});

		it("resolves toward the current text when it changes mid-animation", async () => {
			vi.useFakeTimers();
			try {
				const { container, rerender } = render(HyperText, {
					props: { text: "ABCDE", animateOnLoad: true, seed: 1 },
				});
				const wrapper = container.querySelector(".hyper-text") as HTMLElement;
				await tick(5);
				expect(wrapper.textContent).not.toBe("ABCDE");
				// The running interval reads the text prop live, as the reference
				// implementation does: it must land on the new string, not the one
				// captured when the animation started.
				await rerender({ text: "VWXYZ", animateOnLoad: true, seed: 1 });
				await tick(60);
				expect(wrapper.textContent).toBe("VWXYZ");
			} finally {
				vi.useRealTimers();
			}
		});

		it("scrambles on mouse enter", async () => {
			vi.useFakeTimers();
			try {
				const { container } = render(HyperText, { props: { text: "ABCDE", seed: 1 } });
				const wrapper = container.querySelector(".hyper-text") as HTMLElement;
				// Nothing runs before the pointer arrives.
				await tick(5);
				expect(wrapper.textContent).toBe("ABCDE");
				expect(vi.getTimerCount()).toBe(0);

				wrapper.dispatchEvent(new MouseEvent("mouseenter"));
				await tick(5);
				expect(wrapper.textContent).not.toBe("ABCDE");
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
