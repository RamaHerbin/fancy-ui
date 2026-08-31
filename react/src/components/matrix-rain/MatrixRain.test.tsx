import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { MatrixRain } from "./MatrixRain.js";

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
		fillText(text: string): void;
		setTransform(): void;
	}

	interface Harness {
		glyphs: string[];
		cancelled: number[];
		disconnects: number;
		step(frames: number): void;
		restore(): void;
	}

	function installHarness(): Harness {
		const glyphs: string[] = [];
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
			fillText(text: string) {
				glyphs.push(text);
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

	it("draws the same rain for the same seed and a different one for another seed", () => {
		const first = glyphsDrawn(<MatrixRain />, 8);
		const same = glyphsDrawn(<MatrixRain />, 8);
		const seeded = glyphsDrawn(<MatrixRain seed={99} />, 8);

		expect(first.length).toBeGreaterThan(0);
		expect(same).toEqual(first);
		expect(seeded).not.toEqual(first);
	});
});
