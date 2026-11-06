import { createRef } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { MathBubble } from "./MathBubble.js";
import type { MathBubbleHandle } from "./types.js";
import { createMathBubble } from "./handwrite-core.js";

function setReducedMotion(reduce: boolean) {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: (query: string) => ({
			matches: reduce && query.includes("prefers-reduced-motion: reduce"),
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

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
	setReducedMotion(false);
	frames = [];
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
		frames.push(cb);
		return frames.length;
	});
	vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function runFrame(now: number) {
	const pending = frames;
	frames = [];
	act(() => {
		for (const cb of pending) cb(now);
	});
}

describe("MathBubble", () => {
	it("is an image named by the formula, with the finished still as SVG before it starts", () => {
		const { container } = render(<MathBubble formula={"e^{i\\pi}+1=0"} trigger="manual" />);
		const root = container.querySelector('[data-slot="math-bubble"]')!;
		expect(root.getAttribute("role")).toBe("img");
		expect(root.getAttribute("aria-label")).toBe("e^{i\\pi}+1=0");
		const svg = root.querySelector("svg")!;
		expect(svg.getAttribute("aria-hidden")).toBe("true");
		expect(svg.querySelectorAll("path").length).toBeGreaterThan(3);
		expect(root.querySelector("canvas")).toBeNull();
	});

	it("sizes the wrapper from the engine's drawing", () => {
		const { container } = render(<MathBubble formula="x+y" trigger="manual" size={40} />);
		const drawing = createMathBubble("x+y", { size: 40, seed: 1, strokeWidth: 2.2, hold: 1800 });
		const root = container.querySelector<HTMLElement>('[data-slot="math-bubble"]')!;
		expect(root.style.width).toBe(`${drawing.size.width}px`);
		expect(root.style.height).toBe(`${drawing.size.height}px`);
	});

	it("uses ariaLabel when given and joins an array of formulas otherwise", () => {
		const { container, rerender } = render(
			<MathBubble formula={["a=b", "c=d"]} trigger="manual" />
		);
		const root = container.querySelector('[data-slot="math-bubble"]')!;
		expect(root.getAttribute("aria-label")).toBe("a=b, c=d");
		rerender(<MathBubble formula={["a=b"]} trigger="manual" ariaLabel="Equality" />);
		expect(root.getAttribute("aria-label")).toBe("Equality");
	});

	it("starts on mount, draws on a canvas and fires onComplete when written", () => {
		const onComplete = vi.fn();
		const { container } = render(
			<MathBubble formula="x" trigger="mount" onComplete={onComplete} />
		);
		const root = container.querySelector('[data-slot="math-bubble"]')!;
		expect(root.getAttribute("data-state")).toBe("drawing");
		expect(root.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
		runFrame(performance.now() + 60_000);
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(root.getAttribute("data-state")).toBe("still");
	});

	it("starts when 60% in view, once", () => {
		let fire: IntersectionObserverCallback = () => {};
		let options: IntersectionObserverInit | undefined;
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				constructor(cb: IntersectionObserverCallback, init?: IntersectionObserverInit) {
					fire = cb;
					options = init;
				}
				observe() {}
				unobserve() {}
				disconnect() {}
			}
		);
		const { container } = render(<MathBubble formula="x" />);
		expect(options?.threshold).toBe(0.6);
		expect(container.querySelector("canvas")).toBeNull();
		// The initial notification reports any overlap, even below the threshold: not yet.
		act(() => {
			fire([{ isIntersecting: true, intersectionRatio: 0.2 } as IntersectionObserverEntry], {} as IntersectionObserver);
		});
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("[data-slot=math-bubble]")?.getAttribute("data-state")).toBe("still");
		act(() => {
			fire([{ isIntersecting: true, intersectionRatio: 0.7 } as IntersectionObserverEntry], {} as IntersectionObserver);
		});
		expect(container.querySelector("canvas")).not.toBeNull();
	});

	it("stays still with trigger manual until play(), and reset() returns to the still", () => {
		const ref = createRef<MathBubbleHandle>();
		const { container } = render(<MathBubble ref={ref} formula="x" trigger="manual" />);
		expect(container.querySelector("canvas")).toBeNull();
		act(() => ref.current!.play());
		expect(container.querySelector("canvas")).not.toBeNull();
		act(() => ref.current!.reset());
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("svg")).not.toBeNull();
	});

	it("under reduced motion shows the final still at once and still calls onComplete", () => {
		setReducedMotion(true);
		const onComplete = vi.fn();
		const { container } = render(
			<MathBubble formula="x" trigger="mount" onComplete={onComplete} />
		);
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("svg")).not.toBeNull();
		expect(frames).toHaveLength(0);
	});

	it("cycles an array of formulas when loop is set", () => {
		const onComplete = vi.fn();
		const { container } = render(
			<MathBubble
				formula={["a", "b"]}
				trigger="mount"
				loop
				hold={100}
				onComplete={onComplete}
			/>
		);
		const start = performance.now();
		runFrame(start + 30_000); // first formula written and held
		runFrame(start + 30_001);
		runFrame(start + 90_000); // second formula written: one pass done
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(container.querySelector("canvas")).not.toBeNull();
		expect(frames.length).toBe(1);
	});

	it("renders one still at t without an animation loop", () => {
		const onComplete = vi.fn();
		const { container } = render(<MathBubble formula="x" t={400} onComplete={onComplete} />);
		expect(container.querySelector("canvas")).not.toBeNull();
		expect(frames).toHaveLength(0);
		expect(onComplete).not.toHaveBeenCalled();
	});

	it("applies a custom ink as the wrapper colour and merges className", () => {
		const { container } = render(
			<MathBubble formula="x" trigger="manual" ink="rgb(255, 0, 0)" className="my-bubble" />
		);
		const root = container.querySelector<HTMLElement>('[data-slot="math-bubble"]')!;
		expect(root.style.color).toBe("rgb(255, 0, 0)");
		expect(root.classList.contains("my-bubble")).toBe(true);
	});
});
