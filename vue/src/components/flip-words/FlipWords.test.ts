import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import { createSSRApp, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import FlipWords from "./FlipWords.vue";

describe("FlipWords", () => {
	afterEach(cleanup);

	it("renders the first word initially", () => {
		const { container } = render(FlipWords, {
			props: { words: ["Hello", "World"] },
		});
		const wordSpans = container.querySelectorAll(".flip-words-word");
		expect(wordSpans.length).toBeGreaterThan(0);
		const text = container.querySelector(".flip-words")?.textContent?.trim();
		expect(text).toContain("Hello");
	});

	it("renders letters individually with animation", () => {
		const { container } = render(FlipWords, { props: { words: ["ABC"] } });
		const wrapper = container.querySelector(".flip-words-enter");
		expect(wrapper).toBeTruthy();
		// ABC = 3 letters inside word span
		expect(wrapper?.textContent).toContain("ABC");
	});

	it("applies custom class name", () => {
		const { container } = render(FlipWords, {
			props: { words: ["Test"], class: "my-custom" },
		});
		const inner = container.querySelector(".flip-words-enter");
		expect(inner?.className).toContain("my-custom");
	});

	it("has animation styles on word spans", () => {
		const { container } = render(FlipWords, {
			props: { words: ["Hello World"] },
		});
		const wordSpans = container.querySelectorAll(".flip-words-word");
		wordSpans.forEach((span) => {
			const style = (span as HTMLElement).getAttribute("style") ?? "";
			expect(style).toContain("animation");
			expect(style).toContain("flipFadeInWord");
		});
	});

	it("renders multiple words in a phrase with spaces", () => {
		const { container } = render(FlipWords, {
			props: { words: ["Hello World"] },
		});
		const wordSpans = container.querySelectorAll(".flip-words-word");
		// "Hello World" split by space = 2 word groups
		expect(wordSpans.length).toBe(2);
	});

	// Beyond the transposed suite: the two behaviours a port can silently lose.
	it("renders identically on the server and arms no timer there", async () => {
		const spy = vi.spyOn(globalThis, "setTimeout");
		const first = await renderToString(createSSRApp(FlipWords, { words: ["Better", "Faster"] }));
		const second = await renderToString(createSSRApp(FlipWords, { words: ["Better", "Faster"] }));
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
		expect(first).toBe(second);
		// One collapsible space survives between a word's letters and its
		// trailing non-breaking space, as in the source markup.
		expect(first).toContain('<!--]--> <span class="inline-block"');
	});

	it("starts flipping when a one-word list grows to two", async () => {
		vi.useFakeTimers();
		try {
			const { container, rerender } = render(FlipWords, { props: { words: ["AA"] } });
			await rerender({ words: ["AA", "BB"] });
			vi.advanceTimersByTime(3000);
			await nextTick();
			vi.advanceTimersByTime(600);
			await nextTick();
			expect(container.querySelector(".flip-words")?.textContent).toContain("BB");
		} finally {
			vi.useRealTimers();
		}
	});
});
