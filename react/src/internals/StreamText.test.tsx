import { readFileSync } from "node:fs";
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { act } from "react";
import { StreamText } from "./StreamText.js";

describe("StreamText", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the whole text as plain content on first paint, with nothing animating", () => {
		vi.useFakeTimers();
		const { container } = render(<StreamText text="Hello world" />);
		const wrapper = container.firstElementChild as HTMLElement;

		expect(wrapper.textContent).toBe("Hello world");
		expect(container.querySelector(".ft-fresh")).toBeFalsy();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("wraps only the appended delta in a fresh span, then folds it in once settled", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(<StreamText text="Hello" settleMs={100} />);
		const wrapper = container.firstElementChild as HTMLElement;

		act(() => {
			rerender(<StreamText text="Hello, world" settleMs={100} />);
		});
		const fresh = container.querySelector(".ft-fresh");
		expect(fresh).toBeTruthy();
		expect(fresh?.textContent).toBe(", world");
		expect(wrapper.textContent).toBe("Hello, world");

		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
		expect(container.querySelector(".ft-fresh")).toBeFalsy();
		expect(wrapper.textContent).toBe("Hello, world");
	});

	it("preserves whitespace and newlines, in the settled text and in the delta", () => {
		vi.useFakeTimers();
		const { container, rerender } = render(
			<StreamText text={"line one\n  line two"} settleMs={100} />
		);
		const wrapper = container.firstElementChild as HTMLElement;

		expect(wrapper.textContent).toBe("line one\n  line two");
		expect(wrapper.getAttribute("style")).toContain("pre-wrap");

		act(() => {
			rerender(<StreamText text={"line one\n  line two\n\nline three"} settleMs={100} />);
		});
		expect(container.querySelector(".ft-fresh")?.textContent).toBe("\n\nline three");
		expect(wrapper.textContent).toBe("line one\n  line two\n\nline three");
	});

	it("swaps the content outright, without animating, when the new text is not a continuation", () => {
		vi.useFakeTimers();
		const { container, rerender } = render(<StreamText text="Draft answer" settleMs={100} />);
		const wrapper = container.firstElementChild as HTMLElement;

		act(() => {
			rerender(<StreamText text="Draft answer, revised" settleMs={100} />);
		});
		expect(container.querySelector(".ft-fresh")).toBeTruthy();

		act(() => {
			rerender(<StreamText text="A regenerated answer" settleMs={100} />);
		});
		expect(wrapper.textContent).toBe("A regenerated answer");
		expect(container.querySelector(".ft-fresh")).toBeFalsy();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("merges custom classes and exposes the settle duration to the animation", () => {
		vi.useFakeTimers();
		const { container } = render(<StreamText text="x" settleMs={900} className="text-sm" />);
		const wrapper = container.firstElementChild as HTMLElement;

		expect(wrapper.className).toContain("ft-stream");
		expect(wrapper.className).toContain("text-sm");
		expect(wrapper.getAttribute("style")).toContain("--ft-settle: 900ms");
	});

	/*
	 * The source rule lived in a compiler-scoped `<style>` block, so it only
	 * ever matched this component's own segments. A ported rule ships in a
	 * plain stylesheet, where a bare `.ft-fresh` would hand the tint to any
	 * consumer element carrying the class.
	 */
	it("scopes every rule in its stylesheet under the component root class", () => {
		const css = readFileSync("src/internals/stream-text.css", "utf8");

		expect(css).toContain(".ft-stream .ft-fresh");
		// The selector list, minus the at-rules and the keyframe stops.
		const selectors = [...css.matchAll(/^\s*([.#][^{@]*?)\s*\{/gm)].map(([, sel]) =>
			(sel ?? "").trim()
		);
		expect(selectors.length).toBeGreaterThan(0);
		for (const selector of selectors) {
			expect(selector.startsWith(".ft-stream")).toBe(true);
		}
	});

	it("tears down a pending settle on unmount", () => {
		vi.useFakeTimers();
		const { rerender, unmount } = render(<StreamText text="Hello" settleMs={100} />);

		act(() => {
			rerender(<StreamText text="Hello there" settleMs={100} />);
		});
		expect(vi.getTimerCount()).toBe(1);

		expect(() => unmount()).not.toThrow();
		expect(vi.getTimerCount()).toBe(0);
	});
});
