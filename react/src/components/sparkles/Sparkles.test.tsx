import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { Sparkles } from "./Sparkles.js";

// The Svelte suite stubs `ResizeObserver` in a `beforeEach`; here `src/test-setup.ts`
// installs the same inert fake globally, so the stub is dropped rather than
// duplicated. Its `vi.restoreAllMocks()` teardown goes with it — nothing is mocked.
describe("Sparkles", () => {
	afterEach(cleanup);

	it("renders container div", () => {
		const { container } = render(<Sparkles />);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
		expect(div.tagName).toBe("DIV");
	});

	it("renders canvas element inside container", () => {
		const { container } = render(<Sparkles />);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("applies default background style", () => {
		const { container } = render(<Sparkles />);
		const div = container.firstElementChild as HTMLElement;
		const style = div?.getAttribute("style") ?? "";
		expect(style).toContain("background");
		// jsdom converts hex to rgb
		expect(style).toMatch(/background.*rgb\(13,\s*71,\s*161\)|#0d47a1/);
	});

	it("applies custom background style", () => {
		const { container } = render(<Sparkles background="#ff0000" />);
		const div = container.firstElementChild as HTMLElement;
		const style = div?.getAttribute("style") ?? "";
		expect(style).toMatch(/rgb\(255,\s*0,\s*0\)|#ff0000/);
	});

	it("applies custom class", () => {
		const { container } = render(<Sparkles className="my-sparkles" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-sparkles");
	});

	it("has overflow-hidden class", () => {
		const { container } = render(<Sparkles />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("overflow-hidden");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(<Sparkles className="extra" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("relative");
		expect(div?.className).toContain("overflow-hidden");
		expect(div?.className).toContain("will-change-transform");
	});

	it("canvas has absolute positioning classes", () => {
		const { container } = render(<Sparkles />);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas?.className).toContain("absolute");
		expect(canvas?.className).toContain("inset-0");
	});

	// --- Port-added coverage -------------------------------------------------
	// `getContext` returns null under the shared test setup, so every case above
	// bails out of the draw loop before the first `arc()`. These drive the loop
	// with a recording 2D context and a hand-stepped frame queue: one covers the
	// teardown the Svelte `onMount` cleanup performs, the other covers the `seed`
	// prop this port adds in place of the source's bare `Math.random()`.

	interface Sparkle {
		x: number;
		y: number;
		r: number;
		fill: string;
	}

	interface RecordingContext {
		fillStyle: string;
		clearRect(): void;
		beginPath(): void;
		arc(x: number, y: number, r: number): void;
		fill(): void;
		setTransform(): void;
	}

	interface Harness {
		sparkles: Sparkle[];
		cancelled: number[];
		observed: Element[];
		disconnects: number;
		step(frames: number): void;
		restore(): void;
	}

	function installHarness(): Harness {
		const sparkles: Sparkle[] = [];
		const cancelled: number[] = [];
		const observed: Element[] = [];
		// Keyed by id, like the real frame queue, so `cancelAnimationFrame`
		// actually drops the pending callback instead of only recording the id.
		const queue = new Map<number, FrameRequestCallback>();
		let nextFrameId = 0;
		let disconnects = 0;
		let pending: Sparkle | null = null;

		const ctx: RecordingContext = {
			fillStyle: "",
			clearRect() {},
			beginPath() {},
			arc(x: number, y: number, r: number) {
				pending = { x, y, r, fill: "" };
			},
			fill() {
				if (!pending) return;
				pending.fill = ctx.fillStyle;
				sparkles.push(pending);
				pending = null;
			},
			setTransform() {},
		};

		const originalGetContext = HTMLCanvasElement.prototype.getContext;
		const originalRaf = globalThis.requestAnimationFrame;
		const originalCaf = globalThis.cancelAnimationFrame;
		const originalResizeObserver = globalThis.ResizeObserver;

		HTMLCanvasElement.prototype.getContext = (() =>
			ctx) as unknown as HTMLCanvasElement["getContext"];

		globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
			const id = ++nextFrameId;
			queue.set(id, callback);
			return id;
		}) as typeof globalThis.requestAnimationFrame;

		globalThis.cancelAnimationFrame = ((id: number) => {
			cancelled.push(id);
			queue.delete(id);
		}) as typeof globalThis.cancelAnimationFrame;

		globalThis.ResizeObserver = class {
			observe(target: Element) {
				observed.push(target);
			}
			unobserve() {}
			disconnect() {
				disconnects++;
			}
		} as unknown as typeof ResizeObserver;

		return {
			sparkles,
			cancelled,
			observed,
			get disconnects() {
				return disconnects;
			},
			step(frames: number) {
				for (let i = 0; i < frames; i++) {
					const due = [...queue.values()];
					queue.clear();
					for (const callback of due) callback(0);
				}
			},
			restore() {
				HTMLCanvasElement.prototype.getContext = originalGetContext;
				globalThis.requestAnimationFrame = originalRaf;
				globalThis.cancelAnimationFrame = originalCaf;
				globalThis.ResizeObserver = originalResizeObserver;
			},
		};
	}

	function sparklesDrawn(element: ReactElement, frames: number): Sparkle[] {
		const harness = installHarness();
		try {
			const { unmount } = render(element);
			harness.step(frames);
			unmount();
			return [...harness.sparkles];
		} finally {
			harness.restore();
		}
	}

	it("draws one arc per particle each frame", () => {
		const harness = installHarness();
		try {
			render(<Sparkles particleDensity={5} />);
			harness.step(1);
			expect(harness.sparkles.length).toBe(5);
			harness.step(2);
			expect(harness.sparkles.length).toBe(15);
		} finally {
			harness.restore();
		}
	});

	it("observes the container element, not the canvas", () => {
		const harness = installHarness();
		try {
			const { container } = render(<Sparkles />);
			expect(harness.observed).toEqual([container.firstElementChild]);
		} finally {
			harness.restore();
		}
	});

	it("cancels the frame loop and disconnects the observer on unmount", () => {
		const harness = installHarness();
		try {
			const { unmount } = render(<Sparkles particleDensity={4} />);
			harness.step(3);
			expect(harness.sparkles.length).toBeGreaterThan(0);

			unmount();
			expect(harness.cancelled.length).toBe(1);
			expect(harness.disconnects).toBe(1);

			// Nothing was scheduled beyond the frame that was cancelled.
			const drawn = harness.sparkles.length;
			harness.step(3);
			expect(harness.sparkles.length).toBe(drawn);
		} finally {
			harness.restore();
		}
	});

	it("draws with the particle color, alpha-suffixed per frame", () => {
		const harness = installHarness();
		try {
			render(<Sparkles particleDensity={3} particleColor="#abcdef" />);
			harness.step(1);
			expect(harness.sparkles.length).toBe(3);
			for (const sparkle of harness.sparkles) {
				expect(sparkle.fill).toMatch(/^#abcdef[0-9a-f]{2}$/);
			}
		} finally {
			harness.restore();
		}
	});

	it("sizes every particle between minSize and maxSize", () => {
		const harness = installHarness();
		try {
			render(<Sparkles particleDensity={30} minSize={2} maxSize={5} />);
			harness.step(1);
			expect(harness.sparkles.length).toBe(30);
			for (const sparkle of harness.sparkles) {
				expect(sparkle.r).toBeGreaterThanOrEqual(2);
				expect(sparkle.r).toBeLessThan(5);
			}
		} finally {
			harness.restore();
		}
	});

	it("draws the same field for the same seed and a different one for another seed", () => {
		const first = sparklesDrawn(<Sparkles particleDensity={12} />, 4);
		const same = sparklesDrawn(<Sparkles particleDensity={12} />, 4);
		const seeded = sparklesDrawn(<Sparkles particleDensity={12} seed={99} />, 4);

		expect(first.length).toBeGreaterThan(0);
		expect(same).toEqual(first);
		expect(seeded).not.toEqual(first);
	});

	// jsdom hands out a zero-sized rect and a ratio of 1, which collapses every
	// draw coordinate to 0 and hides how the percentage field is projected. This
	// gives the container a real size and a 2x display so the projection shows.
	function withDisplay(dpr: number, width: number, height: number, run: () => void) {
		const originalRatio = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
		const originalRect = Element.prototype.getBoundingClientRect;

		Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: dpr });
		Element.prototype.getBoundingClientRect = () =>
			({
				x: 0,
				y: 0,
				top: 0,
				left: 0,
				right: width,
				bottom: height,
				width,
				height,
				toJSON() {},
			}) as DOMRect;

		try {
			run();
		} finally {
			if (originalRatio) Object.defineProperty(window, "devicePixelRatio", originalRatio);
			Element.prototype.getBoundingClientRect = originalRect;
		}
	}

	// The context carries a `devicePixelRatio` transform, so the draw calls sit
	// in CSS-pixel space: projecting the percentage field through the raw
	// backing-store size would scale it by the ratio a second time and pen the
	// whole field into the top-left corner of a HiDPI canvas.
	it("projects the field into CSS pixels, so a 2x display lays it out identically", () => {
		let atRatio1: Sparkle[] = [];
		let atRatio2: Sparkle[] = [];

		withDisplay(1, 200, 100, () => {
			atRatio1 = sparklesDrawn(<Sparkles particleDensity={12} />, 2);
		});
		withDisplay(2, 200, 100, () => {
			atRatio2 = sparklesDrawn(<Sparkles particleDensity={12} />, 2);
		});

		expect(atRatio1.length).toBe(24);
		expect(atRatio1.some((sparkle) => sparkle.x > 0)).toBe(true);
		expect(atRatio2).toEqual(atRatio1);

		// The field wraps at -2/102 percent, so it never leaves the surface by
		// more than that margin whatever the ratio.
		for (const sparkle of atRatio2) {
			expect(sparkle.x).toBeGreaterThanOrEqual(-4);
			expect(sparkle.x).toBeLessThanOrEqual(204);
			expect(sparkle.y).toBeGreaterThanOrEqual(-2);
			expect(sparkle.y).toBeLessThanOrEqual(102);
		}
	});
});
