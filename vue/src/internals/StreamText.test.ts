import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import StreamText from "./StreamText.vue";

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
		await nextTick();
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
		await nextTick();
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
		await nextTick();
		expect(container.querySelector(".ft-fresh")).toBeTruthy();

		await rerender({ text: "A regenerated answer" });
		await nextTick();
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
		await nextTick();
		expect(vi.getTimerCount()).toBe(1);

		expect(() => unmount()).not.toThrow();
		expect(vi.getTimerCount()).toBe(0);
	});
});

/*
 * The source writes the fresh flag as `class:ft-fresh={segment.fresh}`, which
 * emits no attribute at all when it is false; React's `className={fresh ?
 * "ft-fresh" : undefined}` does the same. Vue has no `:class` form that does:
 * the object `{ 'ft-fresh': fresh }` and a ternary onto `undefined` or `null`
 * alike go through `normalizeClass`, which returns `""`, and every settled
 * segment ships `class=""` — measured on both paths, client
 * `getAttribute("class") === ""` and server
 * `<span class="">Hello world</span>`. Only leaving the key out of the props
 * object leaves the attribute out, so the binding spreads
 * `segment.fresh ? { class: 'ft-fresh' } : {}`. These pin the outcome, not the
 * mechanism: they fail on any binding that reintroduces the empty attribute.
 */
describe("StreamText settled-segment markup", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("gives a settled segment no class attribute at all", () => {
		vi.useFakeTimers();
		const { container } = render(StreamText, { props: { text: "Hello world" } });
		const segment = container.querySelector(".ft-stream > span") as HTMLElement;

		expect(segment.textContent).toBe("Hello world");
		expect(segment.hasAttribute("class")).toBe(false);
	});

	it("carries the class only while the delta is fresh, and drops it on settle", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(StreamText, {
			props: { text: "Hello", settleMs: 100 },
		});

		await rerender({ text: "Hello, world" });
		await nextTick();
		const spans = [...container.querySelectorAll(".ft-stream > span")];
		expect(spans.map((el) => el.getAttribute("class"))).toEqual([null, "ft-fresh"]);

		await vi.advanceTimersByTimeAsync(100);
		const settled = [...container.querySelectorAll(".ft-stream > span")];
		expect(settled.every((el) => !el.hasAttribute("class"))).toBe(true);
	});

	it("emits no empty class attribute on the server either", async () => {
		const html = await renderToString(
			createSSRApp({ render: () => h(StreamText, { text: "Hello world" }) })
		);

		expect(html).not.toContain('class=""');
		expect(html).not.toContain("ft-fresh");
		expect(html).toContain("Hello world");
	});
});
