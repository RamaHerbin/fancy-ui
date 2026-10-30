import { render, cleanup } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import MathBubble from "./MathBubble.vue";
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

async function runFrame(now: number) {
	const pending = frames;
	frames = [];
	for (const cb of pending) cb(now);
	await nextTick();
}

describe("MathBubble", () => {
	it("is an image named by the formula, with the finished still as SVG before it starts", () => {
		const { container } = render(MathBubble, {
			props: { formula: "e^{i\\pi}+1=0", trigger: "manual" },
		});
		const root = container.querySelector('[data-slot="math-bubble"]')!;
		expect(root.getAttribute("role")).toBe("img");
		expect(root.getAttribute("aria-label")).toBe("e^{i\\pi}+1=0");
		const svg = root.querySelector("svg")!;
		expect(svg.getAttribute("aria-hidden")).toBe("true");
		expect(svg.querySelectorAll("path").length).toBeGreaterThan(3);
		expect(root.querySelector("canvas")).toBeNull();
	});

	it("sizes the wrapper from the engine's drawing", () => {
		const { container } = render(MathBubble, {
			props: { formula: "x+y", trigger: "manual", size: 40 },
		});
		const drawing = createMathBubble("x+y", { size: 40, seed: 1, strokeWidth: 2.2, hold: 1800 });
		const root = container.querySelector<HTMLElement>('[data-slot="math-bubble"]')!;
		expect(root.style.width).toBe(`${drawing.size.width}px`);
		expect(root.style.height).toBe(`${drawing.size.height}px`);
	});

	it("uses ariaLabel when given and joins an array of formulas otherwise", async () => {
		const { container, rerender } = render(MathBubble, {
			props: { formula: ["a=b", "c=d"], trigger: "manual" },
		});
		const root = container.querySelector('[data-slot="math-bubble"]')!;
		expect(root.getAttribute("aria-label")).toBe("a=b, c=d");
		await rerender({ formula: ["a=b"], trigger: "manual", ariaLabel: "Equality" });
		expect(root.getAttribute("aria-label")).toBe("Equality");
	});

	it("starts on mount, draws on a canvas and fires onComplete when written", async () => {
		const onComplete = vi.fn();
		const { container } = render(MathBubble, {
			props: { formula: "x", trigger: "mount", onComplete },
		});
		await nextTick();
		const root = container.querySelector('[data-slot="math-bubble"]')!;
		expect(root.getAttribute("data-state")).toBe("drawing");
		expect(root.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
		await runFrame(performance.now() + 60_000);
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(root.getAttribute("data-state")).toBe("still");
	});

	it("starts when 60% in view, once", async () => {
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
		const { container } = render(MathBubble, { props: { formula: "x" } });
		await nextTick();
		expect(options?.threshold).toBe(0.6);
		expect(container.querySelector("canvas")).toBeNull();
		// The initial notification reports any overlap, even below the threshold: not yet.
		fire([{ isIntersecting: true, intersectionRatio: 0.2 } as IntersectionObserverEntry], {} as IntersectionObserver);
		await nextTick();
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("[data-slot=math-bubble]")?.getAttribute("data-state")).toBe("still");
		fire([{ isIntersecting: true, intersectionRatio: 0.7 } as IntersectionObserverEntry], {} as IntersectionObserver);
		await nextTick();
		expect(container.querySelector("canvas")).not.toBeNull();
	});

	it("stays still with trigger manual until play(), and reset() returns to the still", async () => {
		const wrapper = mount(MathBubble, {
			props: { formula: "x", trigger: "manual" },
			attachTo: document.body,
		});
		await nextTick();
		expect(wrapper.find("canvas").exists()).toBe(false);
		(wrapper.vm as unknown as { play(): void }).play();
		await nextTick();
		expect(wrapper.find("canvas").exists()).toBe(true);
		(wrapper.vm as unknown as { reset(): void }).reset();
		await nextTick();
		expect(wrapper.find("canvas").exists()).toBe(false);
		expect(wrapper.find("svg").exists()).toBe(true);
		wrapper.unmount();
	});

	it("under reduced motion shows the final still at once and still calls onComplete", async () => {
		setReducedMotion(true);
		const onComplete = vi.fn();
		const { container } = render(MathBubble, {
			props: { formula: "x", trigger: "mount", onComplete },
		});
		await nextTick();
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("svg")).not.toBeNull();
		expect(frames).toHaveLength(0);
	});

	it("cycles an array of formulas when loop is set", async () => {
		const onComplete = vi.fn();
		const { container } = render(MathBubble, {
			props: { formula: ["a", "b"], trigger: "mount", loop: true, hold: 100, onComplete },
		});
		await nextTick();
		const start = performance.now();
		await runFrame(start + 30_000); // first formula written and held
		await runFrame(start + 30_001);
		await runFrame(start + 90_000); // second formula written: one pass done
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(container.querySelector("canvas")).not.toBeNull();
		expect(frames.length).toBe(1);
	});

	it("renders one still at t without an animation loop", async () => {
		const onComplete = vi.fn();
		const { container } = render(MathBubble, { props: { formula: "x", t: 400, onComplete } });
		await nextTick();
		expect(container.querySelector("canvas")).not.toBeNull();
		expect(frames).toHaveLength(0);
		expect(onComplete).not.toHaveBeenCalled();
	});

	it("applies a custom ink as the wrapper colour and merges class", () => {
		const { container } = render(MathBubble, {
			props: { formula: "x", trigger: "manual", ink: "rgb(255, 0, 0)", class: "my-bubble" },
		});
		const root = container.querySelector<HTMLElement>('[data-slot="math-bubble"]')!;
		expect(root.style.color).toBe("rgb(255, 0, 0)");
		expect(root.classList.contains("my-bubble")).toBe(true);
	});
});
