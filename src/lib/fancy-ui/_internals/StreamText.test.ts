import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import StreamText from "./StreamText.svelte";

describe("StreamText", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the whole text as plain content on first paint, with nothing animating", () => {
		vi.useFakeTimers();
		const { container } = render(StreamText, { props: { text: "Hello world" } });
		const wrapper = container.firstElementChild as HTMLElement;

		expect(wrapper.textContent).toBe("Hello world");
		expect(container.querySelector(".ft-fresh")).toBeFalsy();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("wraps only the appended delta in a fresh span, then folds it in once settled", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(StreamText, {
			props: { text: "Hello", settleMs: 100 },
		});
		const wrapper = container.firstElementChild as HTMLElement;

		await rerender({ text: "Hello, world" });
		const fresh = container.querySelector(".ft-fresh");
		expect(fresh).toBeTruthy();
		expect(fresh?.textContent).toBe(", world");
		expect(wrapper.textContent).toBe("Hello, world");

		await vi.advanceTimersByTimeAsync(100);
		expect(container.querySelector(".ft-fresh")).toBeFalsy();
		expect(wrapper.textContent).toBe("Hello, world");
	});

	it("preserves whitespace and newlines, in the settled text and in the delta", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(StreamText, {
			props: { text: "line one\n  line two", settleMs: 100 },
		});
		const wrapper = container.firstElementChild as HTMLElement;

		expect(wrapper.textContent).toBe("line one\n  line two");
		expect(wrapper.getAttribute("style")).toContain("pre-wrap");

		await rerender({ text: "line one\n  line two\n\nline three" });
		expect(container.querySelector(".ft-fresh")?.textContent).toBe("\n\nline three");
		expect(wrapper.textContent).toBe("line one\n  line two\n\nline three");
	});

	it("swaps the content outright, without animating, when the new text is not a continuation", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(StreamText, {
			props: { text: "Draft answer", settleMs: 100 },
		});
		const wrapper = container.firstElementChild as HTMLElement;

		await rerender({ text: "Draft answer, revised" });
		expect(container.querySelector(".ft-fresh")).toBeTruthy();

		await rerender({ text: "A regenerated answer" });
		expect(wrapper.textContent).toBe("A regenerated answer");
		expect(container.querySelector(".ft-fresh")).toBeFalsy();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("merges custom classes and exposes the settle duration to the animation", () => {
		vi.useFakeTimers();
		const { container } = render(StreamText, {
			props: { text: "x", settleMs: 900, class: "text-sm" },
		});
		const wrapper = container.firstElementChild as HTMLElement;

		expect(wrapper.className).toContain("ft-stream");
		expect(wrapper.className).toContain("text-sm");
		expect(wrapper.getAttribute("style")).toContain("--ft-settle: 900ms");
	});

	it("tears down a pending settle on unmount", async () => {
		vi.useFakeTimers();
		const { unmount, rerender } = render(StreamText, {
			props: { text: "Hello", settleMs: 100 },
		});

		await rerender({ text: "Hello there" });
		expect(vi.getTimerCount()).toBe(1);

		expect(() => unmount()).not.toThrow();
		expect(vi.getTimerCount()).toBe(0);
	});
});
