import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { MatrixRain } from "./MatrixRain.js";
import { FakeIntersectionObserver } from "../../test-setup.js";

describe("MatrixRain", () => {
	afterEach(cleanup);

	it("renders a canvas element", () => {
		const { container } = render(<MatrixRain />);
		expect(container.querySelector("canvas")).toBeTruthy();
	});

	it("applies the base fill/background classes", () => {
		const { container } = render(<MatrixRain />);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas.className).toContain("block");
		expect(canvas.className).toContain("h-full");
		expect(canvas.className).toContain("w-full");
		expect(canvas.className).toContain("bg-black");
	});

	it("applies custom class names alongside the base classes", () => {
		const { container } = render(<MatrixRain className="my-rain" />);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas.className).toContain("my-rain");
		expect(canvas.className).toContain("block");
	});

	it("mounts and unmounts without throwing when getContext('2d') is unavailable (jsdom has no canvas backend)", () => {
		const { unmount } = render(
			<MatrixRain color="#ff00ff" speed={2} density={0.5} glyphSize={20} fadeOpacity={0.1} />
		);
		expect(() => unmount()).not.toThrow();
	});

	// --- Port-added coverage -------------------------------------------------
	// jsdom's `getContext` returns null (test-setup), so the four transposed
	// cases above never enter the render loop at all. These two drive it with a
	// recording 2D context and a hand-stepped frame queue: one covers the
	// teardown the Svelte `$effect` cleanup performs, the other covers the
	// `seed` prop this port adds in place of the source's bare `Math.random()`.

	interface RecordingContext {
		fillStyle: string;
		font: string;
		shadowBlur: number;
		shadowColor: string;
		fillRect(): void;
		fillText(text: string, x: number): void;
		setTransform(): void;
	}

	interface Harness {
		glyphs: string[];
		/** x of every `fillText`, in draw order — one per glyph in `glyphs`. */
		xs: number[];
		cancelled: number[];
		disconnects: number;
		step(frames: number): void;
		restore(): void;
	}

	/**
	 * jsdom reports 0 for every layout box, and a zero-width canvas is always a
	 * single column — so a column-count assertion needs a canvas that claims a
	 * real size. Defined on the prototype and deleted afterwards, which restores
	 * the inherited `Element` getter.
	 */
	function stubCanvasSize(width: number, height: number): () => void {
		for (const [name, value] of [
			["clientWidth", width],
			["clientHeight", height],
		] as const) {
			Object.defineProperty(HTMLCanvasElement.prototype, name, {
				configurable: true,
				get: () => value,
			});
		}
		return () => {
			// Removing the own property restores the inherited `Element` getter.
			// `Reflect.deleteProperty` rather than `delete`, which TypeScript
			// refuses on a readonly DOM member.
			Reflect.deleteProperty(HTMLCanvasElement.prototype, "clientWidth");
			Reflect.deleteProperty(HTMLCanvasElement.prototype, "clientHeight");
		};
	}

	function installHarness(): Harness {
		const glyphs: string[] = [];
		const xs: number[] = [];
		const cancelled: number[] = [];
		// Keyed by id, like the real frame queue, so `cancelAnimationFrame`
		// actually drops the pending callback instead of only recording the id.
		const queue = new Map<number, FrameRequestCallback>();
		let nextFrameId = 0;
		let disconnects = 0;

		const ctx: RecordingContext = {
			fillStyle: "",
			font: "",
			shadowBlur: 0,
			shadowColor: "",
			fillRect() {},
			fillText(text: string, x: number) {
				glyphs.push(text);
				xs.push(x);
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
			observe() {}
			unobserve() {}
			disconnect() {
				disconnects++;
			}
		} as unknown as typeof ResizeObserver;

		return {
			glyphs,
			xs,
			cancelled,
			get disconnects() {
				return disconnects;
			},
			step(frames: number) {
				for (let i = 0; i < frames; i++) {
					const pending = [...queue.values()];
					queue.clear();
					for (const callback of pending) callback(0);
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

	function glyphsDrawn(element: ReactElement, frames: number): string[] {
		const harness = installHarness();
		try {
			const { unmount } = render(element);
			harness.step(frames);
			unmount();
			return [...harness.glyphs];
		} finally {
			harness.restore();
		}
	}

	it("cancels the frame loop and disconnects the observer on unmount", () => {
		const harness = installHarness();
		try {
			const { unmount } = render(<MatrixRain />);
			harness.step(3);
			expect(harness.glyphs.length).toBeGreaterThan(0);

			unmount();
			expect(harness.cancelled.length).toBe(1);
			expect(harness.disconnects).toBe(1);

			// Nothing was scheduled beyond the frame that was cancelled.
			const drawn = harness.glyphs.length;
			harness.step(3);
			expect(harness.glyphs.length).toBe(drawn);
		} finally {
			harness.restore();
		}
	});

	/** How many distinct columns a single frame paints at this density. */
	function columnCount(density: number): number {
		const restoreSize = stubCanvasSize(800, 400);
		const harness = installHarness();
		try {
			const { unmount } = render(<MatrixRain density={density} glyphSize={16} />);
			harness.step(1);
			const count = new Set(harness.xs).size;
			unmount();
			return count;
		} finally {
			harness.restore();
			restoreSize();
		}
	}

	// Regression: `density` is documented as "higher = more, narrower columns",
	// but the column pitch used to be `glyphSize * density` — which made a
	// higher density draw FEWER, wider columns. The upstream Svelte source has
	// the same inversion; this port follows the documented contract instead and
	// records the divergence.
	it("packs in more columns as density rises, per the documented contract", () => {
		const sparse = columnCount(0.5);
		const normal = columnCount(1);
		const dense = columnCount(2);

		expect(normal).toBe(50); // 800px / 16px
		expect(dense).toBeGreaterThan(normal);
		expect(sparse).toBeLessThan(normal);
		expect(dense).toBe(100);
		expect(sparse).toBe(25);
	});

	/** The observer watching the canvas — the last one constructed. */
	function latestIntersectionObserver(): FakeIntersectionObserver {
		const observers = FakeIntersectionObserver.instances;
		return observers[observers.length - 1] as FakeIntersectionObserver;
	}

	it("pauses the frame loop while the canvas is out of view and resumes it on the way back", () => {
		const harness = installHarness();
		try {
			const { unmount } = render(<MatrixRain />);
			harness.step(2);
			const drawnWhileVisible = harness.glyphs.length;
			expect(drawnWhileVisible).toBeGreaterThan(0);

			const observer = latestIntersectionObserver();
			act(() => observer.trigger(false));

			// The pending frame was cancelled and no replacement queued, so
			// stepping the queue paints nothing at all.
			expect(harness.cancelled.length).toBe(1);
			harness.step(3);
			expect(harness.glyphs.length).toBe(drawnWhileVisible);

			act(() => observer.trigger(true));
			harness.step(1);
			expect(harness.glyphs.length).toBeGreaterThan(drawnWhileVisible);

			unmount();
		} finally {
			harness.restore();
		}
	});

	it("does not queue a second loop when the observer reports visible again while already running", () => {
		const harness = installHarness();
		try {
			const { unmount } = render(<MatrixRain />);
			harness.step(1);
			const oneFrame = harness.glyphs.length;

			const observer = latestIntersectionObserver();
			act(() => observer.trigger(true));
			act(() => observer.trigger(true));

			// A second queued frame would double the glyphs painted per step.
			harness.step(1);
			expect(harness.glyphs.length).toBe(oneFrame * 2);

			unmount();
		} finally {
			harness.restore();
		}
	});

	it("draws the same rain for the same seed and a different one for another seed", () => {
		const first = glyphsDrawn(<MatrixRain />, 8);
		const same = glyphsDrawn(<MatrixRain />, 8);
		const seeded = glyphsDrawn(<MatrixRain seed={99} />, 8);

		expect(first.length).toBeGreaterThan(0);
		expect(same).toEqual(first);
		expect(seeded).not.toEqual(first);
	});
});
