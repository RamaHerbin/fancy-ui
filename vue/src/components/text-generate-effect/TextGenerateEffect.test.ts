import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/vue";
import { nextTick } from "vue";
import TextGenerateEffect from "./TextGenerateEffect.vue";

describe("TextGenerateEffect", () => {
	it("renders all words as spans", () => {
		const { container } = render(TextGenerateEffect, {
			props: { words: "hello world test" },
		});
		const spans = container.querySelectorAll("span");
		expect(spans.length).toBe(3);
	});

	it("words start hidden with blur", () => {
		const { container } = render(TextGenerateEffect, {
			props: { words: "fade in" },
		});
		const spans = container.querySelectorAll("span");
		expect(spans[0]!.style.opacity).toBe("0");
		expect(spans[0]!.style.filter).toContain("blur(10px)");
	});

	it("words start hidden without blur when filter is false", () => {
		const { container } = render(TextGenerateEffect, {
			props: { words: "no blur", filter: false },
		});
		const spans = container.querySelectorAll("span");
		expect(spans[0]!.style.opacity).toBe("0");
		expect(spans[0]!.style.filter).toBe("none");
	});

	it("reveals words after stagger delay", async () => {
		vi.useFakeTimers();
		const { container } = render(TextGenerateEffect, {
			props: { words: "one two three", stagger: 100 },
		});
		const spans = container.querySelectorAll("span");

		// Flush the outer setTimeout(fn, 0) + first word setTimeout(fn, 0)
		await vi.advanceTimersByTimeAsync(1);
		expect(spans[0]!.style.opacity).toBe("1");
		expect(spans[1]!.style.opacity).toBe("0");

		// After 100ms — second word
		await vi.advanceTimersByTimeAsync(100);
		expect(spans[1]!.style.opacity).toBe("1");
		expect(spans[2]!.style.opacity).toBe("0");

		// After 200ms — third word
		await vi.advanceTimersByTimeAsync(100);
		expect(spans[2]!.style.opacity).toBe("1");

		vi.useRealTimers();
	});

	it("respects initial delay", async () => {
		vi.useFakeTimers();
		const { container } = render(TextGenerateEffect, {
			props: { words: "delayed text", delay: 500 },
		});
		const spans = container.querySelectorAll("span");

		await vi.advanceTimersByTimeAsync(499);
		expect(spans[0]!.style.opacity).toBe("0");

		await vi.advanceTimersByTimeAsync(2);
		expect(spans[0]!.style.opacity).toBe("1");

		vi.useRealTimers();
	});

	it("applies custom class", () => {
		const { container } = render(TextGenerateEffect, {
			props: { words: "styled", class: "my-class" },
		});
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("my-class");
	});

	it("sets custom duration in transition style", () => {
		const { container } = render(TextGenerateEffect, {
			props: { words: "fast", duration: 0.3 },
		});
		const span = container.querySelector("span") as HTMLElement;
		expect(span.style.transition).toContain("0.3s");
	});

	it("picks up a filter change made mid-reveal", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(TextGenerateEffect, {
			props: { words: "one two three", stagger: 100 },
		});
		const spans = container.querySelectorAll("span");

		await vi.advanceTimersByTimeAsync(1);
		expect(spans[0]!.style.filter).toBe("blur(0px)");

		await rerender({ words: "one two three", stagger: 100, filter: false });

		// The word revealed after the change uses the current filter value.
		await vi.advanceTimersByTimeAsync(100);
		expect(spans[1]!.style.opacity).toBe("1");
		expect(spans[1]!.style.filter).toBe("none");

		vi.useRealTimers();
	});

	it("picks up a stagger change made before the reveal starts", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(TextGenerateEffect, {
			props: { words: "one two three", delay: 500, stagger: 100 },
		});
		const spans = container.querySelectorAll("span");

		await rerender({ words: "one two three", delay: 500, stagger: 1000 });

		await vi.advanceTimersByTimeAsync(501);
		expect(spans[0]!.style.opacity).toBe("1");

		// The old 100ms spacing would have revealed the second word by now.
		await vi.advanceTimersByTimeAsync(100);
		expect(spans[1]!.style.opacity).toBe("0");

		await vi.advanceTimersByTimeAsync(900);
		expect(spans[1]!.style.opacity).toBe("1");

		vi.useRealTimers();
	});

	it("keeps revealed words visible across an unrelated re-render", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(TextGenerateEffect, {
			props: { words: "one two three", stagger: 100 },
		});
		const spans = container.querySelectorAll("span");

		await vi.advanceTimersByTimeAsync(1);
		expect(spans[0]!.style.opacity).toBe("1");

		await rerender({ words: "one two three", stagger: 100, class: "extra" });
		await nextTick();

		expect(spans[0]!.style.opacity).toBe("1");
		expect(spans[0]!.style.filter).toBe("blur(0px)");

		vi.useRealTimers();
	});

	it("clears pending word timeouts on unmount after a words change", async () => {
		vi.useFakeTimers();
		const { rerender, unmount } = render(TextGenerateEffect, {
			props: { words: "one two", stagger: 100 },
		});

		await vi.advanceTimersByTimeAsync(1);
		expect(vi.getTimerCount()).toBe(1);

		await rerender({ words: "three four", stagger: 100 });
		await nextTick();

		unmount();
		expect(vi.getTimerCount()).toBe(0);

		vi.useRealTimers();
	});
});
