import { render, cleanup, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollProgress } from "./ScrollProgress.js";

/** jsdom never lays anything out, so scroll geometry has to be faked by
 * hand on whichever node stands in for "the scroller" — `document.documentElement`
 * for the window case, or a plain element for the `target` case. Every
 * property scroll-progress reads (`scrollTop`, `scrollHeight`,
 * `clientHeight`, `window.scrollY`) is read-only in real browsers, so a real
 * `Object.defineProperty` override — not a plain assignment — is required. */
function mockScrollable(
	node: Element,
	metrics: { scrollTop: number; scrollHeight: number; clientHeight: number }
) {
	Object.defineProperty(node, "scrollTop", { value: metrics.scrollTop, configurable: true });
	Object.defineProperty(node, "scrollHeight", { value: metrics.scrollHeight, configurable: true });
	Object.defineProperty(node, "clientHeight", { value: metrics.clientHeight, configurable: true });
}

function mockWindowScroll(scrollY: number) {
	Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true });
}

function bar(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-scrollprogress-bar") as HTMLElement;
}

function root(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-scrollprogress") as HTMLElement;
}

describe("ScrollProgress", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["requestAnimationFrame", "setTimeout"] });
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		// vi.spyOn on an already-mocked method reuses the existing mock rather
		// than layering a new one, so without restoring here a later test's
		// `.mock.calls` would still carry an earlier test's addEventListener
		// calls too.
		vi.restoreAllMocks();
	});

	it("defaults to JS mode — jsdom has no CSS.supports, so the @supports gate can never pass", () => {
		mockWindowScroll(0);
		Object.defineProperty(document.documentElement, "scrollHeight", {
			value: 2000,
			configurable: true,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			value: 1000,
			configurable: true,
		});

		const { container } = render(<ScrollProgress />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(root(container).dataset.mode).toBe("js");
	});

	it("CSS mode: no target, no label, and a stubbed CSS.supports — no scroll/resize listeners attach", () => {
		vi.stubGlobal("CSS", { supports: () => true });
		const addSpy = vi.spyOn(window, "addEventListener");

		const { container } = render(<ScrollProgress />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(root(container).dataset.mode).toBe("css");
		expect(addSpy.mock.calls.some(([type]) => type === "scroll")).toBe(false);
		expect(addSpy.mock.calls.some(([type]) => type === "resize")).toBe(false);
	});

	it("a `target` forces JS mode even when CSS.supports would otherwise allow the zero-JS path", () => {
		vi.stubGlobal("CSS", { supports: () => true });
		const target = document.createElement("div");
		document.body.appendChild(target);
		mockScrollable(target, { scrollTop: 0, scrollHeight: 100, clientHeight: 100 });

		const { container } = render(<ScrollProgress target={target} />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(root(container).dataset.mode).toBe("js");
		target.remove();
	});

	it("mode is derived, not latched: a `target` handed to the component AFTER mount flips it from css to js and attaches a scroll listener", () => {
		vi.stubGlobal("CSS", { supports: () => true });
		const target = document.createElement("div");
		document.body.appendChild(target);
		mockScrollable(target, { scrollTop: 0, scrollHeight: 100, clientHeight: 100 });
		const targetAdd = vi.spyOn(target, "addEventListener");

		const { container, rerender } = render(<ScrollProgress />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		// Mounted with no target/label — capability is supported, so it starts
		// in CSS mode.
		expect(root(container).dataset.mode).toBe("css");
		expect(targetAdd.mock.calls.some(([type]) => type === "scroll")).toBe(false);

		// A target arrives afterward (e.g. a callback-ref element resolved on
		// a later render, or a conditionally rendered scroller). If `mode`
		// were latched at mount this would never be reflected.
		rerender(<ScrollProgress target={target} />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(root(container).dataset.mode).toBe("js");
		expect(targetAdd.mock.calls.some(([type]) => type === "scroll")).toBe(true);
		target.remove();
	});

	it("a `label` forces JS mode and renders progressbar ARIA + an initial aria-valuenow", () => {
		mockWindowScroll(0);
		Object.defineProperty(document.documentElement, "scrollHeight", {
			value: 1000,
			configurable: true,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			value: 1000,
			configurable: true,
		});

		const { container } = render(<ScrollProgress label="Reading progress" />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		const el = root(container);
		expect(el.getAttribute("role")).toBe("progressbar");
		expect(el.getAttribute("aria-label")).toBe("Reading progress");
		expect(el.getAttribute("aria-valuemin")).toBe("0");
		expect(el.getAttribute("aria-valuemax")).toBe("100");
		expect(el.hasAttribute("aria-valuenow")).toBe(true);
		expect(el.hasAttribute("aria-hidden")).toBe(false);
	});

	it("no label: aria-hidden, no progressbar role", () => {
		const { container } = render(<ScrollProgress />);
		const el = root(container);
		expect(el.getAttribute("aria-hidden")).toBe("true");
		expect(el.hasAttribute("role")).toBe(false);
		expect(el.hasAttribute("aria-valuenow")).toBe(false);
	});

	it("position sets data-position", () => {
		const { container: top } = render(<ScrollProgress />);
		expect(root(top).dataset.position).toBe("top");
		cleanup();

		const { container: bottom } = render(<ScrollProgress position="bottom" />);
		expect(root(bottom).dataset.position).toBe("bottom");
		cleanup();

		const { container: inline } = render(<ScrollProgress position="inline" />);
		expect(root(inline).dataset.position).toBe("inline");
	});

	it("JS mode: a scroll event, throttled to a frame, writes --ft-scrollprogress-value and rounds aria-valuenow", () => {
		mockWindowScroll(0);
		Object.defineProperty(document.documentElement, "scrollHeight", {
			value: 2000,
			configurable: true,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			value: 1000,
			configurable: true,
		});

		const { container } = render(<ScrollProgress label="Progress" />);
		act(() => {
			vi.advanceTimersToNextFrame(); // initial paint
		});

		mockWindowScroll(500); // halfway through the 1000px scrollable range
		window.dispatchEvent(new Event("scroll"));

		// Not yet — the write only happens once the throttled frame runs.
		const el = root(container);
		expect(el.getAttribute("aria-valuenow")).toBe("0");

		// The CSS var write bypasses React state (direct `style.setProperty`,
		// visible immediately); `aria-valuenow` goes through state → JSX,
		// which `act` flushes alongside the rAF advance.
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(root(container).style.getPropertyValue("--ft-scrollprogress-value")).toBe("0.5");
		expect(el.getAttribute("aria-valuenow")).toBe("50");
	});

	it("a burst of scroll events before the frame runs still only paints once, with the latest value", () => {
		mockWindowScroll(0);
		Object.defineProperty(document.documentElement, "scrollHeight", {
			value: 2000,
			configurable: true,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			value: 1000,
			configurable: true,
		});

		const { container } = render(<ScrollProgress />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		mockWindowScroll(200);
		window.dispatchEvent(new Event("scroll"));
		mockWindowScroll(1000);
		window.dispatchEvent(new Event("scroll"));

		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(root(container).style.getPropertyValue("--ft-scrollprogress-value")).toBe("1");
	});

	it("clamps a scroll position beyond the scrollable range to [0, 1]", () => {
		const target = document.createElement("div");
		document.body.appendChild(target);
		mockScrollable(target, { scrollTop: 99999, scrollHeight: 1000, clientHeight: 500 });

		const { container } = render(<ScrollProgress target={target} label="P" />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(root(container).style.getPropertyValue("--ft-scrollprogress-value")).toBe("1");
		expect(root(container).getAttribute("aria-valuenow")).toBe("100");
		target.remove();
	});

	it("`target` mode: content growing with no scroll still moves the bar", async () => {
		// The old `resize` listener on the element was dead weight — only a
		// window fires that event — so a target whose content grew (a streamed
		// answer, a lazily loaded page) went on reporting the fraction it had
		// while the content was shorter, until something happened to scroll.
		const target = document.createElement("div");
		document.body.appendChild(target);
		mockScrollable(target, { scrollTop: 50, scrollHeight: 200, clientHeight: 100 });

		const { container } = render(<ScrollProgress target={target} label="P" />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});
		expect(root(container).style.getPropertyValue("--ft-scrollprogress-value")).toBe("0.5");

		// Twice as much to read, from the same scroll position: half way down
		// is now a quarter of the way through.
		mockScrollable(target, { scrollTop: 50, scrollHeight: 400, clientHeight: 100 });
		target.appendChild(document.createElement("p"));

		// The MutationObserver callback is a microtask (real, even on fake
		// timers), and the update it schedules is throttled to a frame.
		await act(async () => {});
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(root(container).style.getPropertyValue("--ft-scrollprogress-value")).toBe(
			String(50 / 300)
		);
		expect(root(container).getAttribute("aria-valuenow")).toBe("17");
		target.remove();
	});

	it("content with nothing to scroll reads as 0, never NaN", () => {
		mockWindowScroll(0);
		Object.defineProperty(document.documentElement, "scrollHeight", {
			value: 500,
			configurable: true,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			value: 500,
			configurable: true,
		});

		const { container } = render(<ScrollProgress label="P" />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(root(container).style.getPropertyValue("--ft-scrollprogress-value")).toBe("0");
		expect(root(container).getAttribute("aria-valuenow")).toBe("0");
	});

	it("`target` mode attaches listeners on the target, not window", () => {
		const target = document.createElement("div");
		document.body.appendChild(target);
		mockScrollable(target, { scrollTop: 0, scrollHeight: 100, clientHeight: 100 });
		const targetAdd = vi.spyOn(target, "addEventListener");
		const windowAdd = vi.spyOn(window, "addEventListener");

		render(<ScrollProgress target={target} />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(targetAdd.mock.calls.some(([type]) => type === "scroll")).toBe(true);
		expect(windowAdd.mock.calls.some(([type]) => type === "scroll")).toBe(false);
		target.remove();
	});

	it("registers scroll/resize as passive listeners", () => {
		const addSpy = vi.spyOn(window, "addEventListener");

		render(<ScrollProgress label="P" />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		const scrollCall = addSpy.mock.calls.find(([type]) => type === "scroll");
		const resizeCall = addSpy.mock.calls.find(([type]) => type === "resize");
		expect(scrollCall?.[2]).toMatchObject({ passive: true });
		expect(resizeCall?.[2]).toMatchObject({ passive: true });
	});

	it("reduced motion does not disable JS-mode tracking — ScrollProgress is not gated by that preference", () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: query.includes("prefers-reduced-motion"),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}));
		mockWindowScroll(0);
		Object.defineProperty(document.documentElement, "scrollHeight", {
			value: 2000,
			configurable: true,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			value: 1000,
			configurable: true,
		});

		const { container } = render(<ScrollProgress />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		mockWindowScroll(1000);
		window.dispatchEvent(new Event("scroll"));
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		expect(root(container).style.getPropertyValue("--ft-scrollprogress-value")).toBe("1");
	});

	it("cleanup: unmount removes the scroll/resize listeners and cancels the pending frame", () => {
		mockWindowScroll(0);
		Object.defineProperty(document.documentElement, "scrollHeight", {
			value: 2000,
			configurable: true,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			value: 1000,
			configurable: true,
		});
		const removeSpy = vi.spyOn(window, "removeEventListener");
		const cafSpy = vi.spyOn(window, "cancelAnimationFrame");

		const { unmount } = render(<ScrollProgress />);
		act(() => {
			vi.advanceTimersToNextFrame();
		});

		mockWindowScroll(300);
		window.dispatchEvent(new Event("scroll")); // schedules a frame that will never run

		unmount();

		expect(removeSpy.mock.calls.some(([type]) => type === "scroll")).toBe(true);
		expect(removeSpy.mock.calls.some(([type]) => type === "resize")).toBe(true);
		expect(cafSpy).toHaveBeenCalled();
	});

	it("merges a custom class alongside ft-scrollprogress", () => {
		const { container } = render(<ScrollProgress className="my-bar" />);
		expect(root(container).className).toContain("ft-scrollprogress");
		expect(root(container).className).toContain("my-bar");
	});
});
