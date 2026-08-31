import { render, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { FallingStarsBg } from "./FallingStarsBg.js";

/**
 * A recording ResizeObserver. `src/test-setup.ts` already installs an inert one
 * globally, so the component runs without this; the spies are what let the
 * cleanup test see `observe()` and `disconnect()`. This is the counterpart of
 * the Svelte suite's `beforeEach` stub.
 */
class RecordingResizeObserver {
	static instances: RecordingResizeObserver[] = [];

	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();

	constructor() {
		RecordingResizeObserver.instances.push(this);
	}
}

/**
 * jsdom draws nothing - `test-setup.ts` makes `getContext()` return null, which
 * is the null-context path the component already guards. This fake records the
 * 2D calls instead, so the ported projection can be asserted frame by frame.
 */
class FakeContext {
	readonly calls: string[] = [];

	strokeStyle = "";
	fillStyle = "";
	lineWidth = 0;

	setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
		this.calls.push(`setTransform(${a},${b},${c},${d},${e},${f})`);
	}
	clearRect(x: number, y: number, w: number, h: number) {
		this.calls.push(`clearRect(${x},${y},${w},${h})`);
	}
	beginPath() {
		this.calls.push("beginPath");
	}
	moveTo(x: number, y: number) {
		this.calls.push(`moveTo(${x},${y})`);
	}
	lineTo(x: number, y: number) {
		this.calls.push(`lineTo(${x},${y})`);
	}
	stroke() {
		this.calls.push(`stroke(${this.strokeStyle},${this.lineWidth})`);
	}
	arc(x: number, y: number, radius: number, start: number, end: number) {
		this.calls.push(`arc(${x},${y},${radius},${start},${end})`);
	}
	fill() {
		this.calls.push(`fill(${this.fillStyle})`);
	}
}

const originalResizeObserver = globalThis.ResizeObserver;
const originalGetContext = HTMLCanvasElement.prototype.getContext;

/**
 * Hands the canvas a recording context and takes the animation loop off the
 * clock: frames are queued and run one at a time, so a test drives exactly the
 * number of frames it asserts on.
 */
function installCanvasRecorder() {
	const fake = new FakeContext();
	HTMLCanvasElement.prototype.getContext = (() =>
		fake) as unknown as HTMLCanvasElement["getContext"];

	const frames: FrameRequestCallback[] = [];
	const raf = vi
		.spyOn(globalThis, "requestAnimationFrame")
		.mockImplementation((callback: FrameRequestCallback) => {
			frames.push(callback);
			return frames.length;
		});

	return {
		calls: fake.calls,
		drawFrame() {
			const frame = frames.shift();
			if (!frame) throw new Error("no animation frame was requested");
			frame(0);
		},
		restore() {
			raf.mockRestore();
			HTMLCanvasElement.prototype.getContext = originalGetContext;
		},
	};
}

describe("FallingStarsBg", () => {
	beforeEach(() => {
		RecordingResizeObserver.instances.length = 0;
		globalThis.ResizeObserver = RecordingResizeObserver as unknown as typeof ResizeObserver;
	});

	afterEach(() => {
		cleanup();
		globalThis.ResizeObserver = originalResizeObserver;
		HTMLCanvasElement.prototype.getContext = originalGetContext;
		vi.restoreAllMocks();
	});

	it("renders a canvas element", () => {
		const { container } = render(<FallingStarsBg />);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("canvas has absolute positioning class", () => {
		const { container } = render(<FallingStarsBg />);
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("absolute");
	});

	it("canvas has inset-0 class", () => {
		const { container } = render(<FallingStarsBg />);
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("inset-0");
	});

	it("canvas has full width and height classes", () => {
		const { container } = render(<FallingStarsBg />);
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("h-full");
		expect(canvas?.className).toContain("w-full");
	});

	it("applies custom class names", () => {
		const { container } = render(<FallingStarsBg className="my-stars" />);
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("my-stars");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(<FallingStarsBg className="extra" />);
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("absolute");
		expect(canvas?.className).toContain("inset-0");
		expect(canvas?.className).toContain("h-full");
		expect(canvas?.className).toContain("w-full");
	});

	// The Svelte suite stops at the class list. The rest is the React layer:
	// the canvas lifecycle now lives in an effect, so its teardown and its draw
	// path are what a port breaks silently.

	it("observes the canvas, then stops the loop and disconnects on unmount", () => {
		const cancel = vi.spyOn(globalThis, "cancelAnimationFrame");
		const { container, unmount } = render(<FallingStarsBg />);
		const canvas = container.querySelector("canvas");

		const observer = RecordingResizeObserver.instances[0];
		expect(observer).toBeDefined();
		expect(observer?.observe).toHaveBeenCalledWith(canvas);

		unmount();

		expect(cancel).toHaveBeenCalled();
		expect(observer?.disconnect).toHaveBeenCalled();
	});

	it("draws each star with the requested colour, three glow layers deep", () => {
		const recorder = installCanvasRecorder();
		render(<FallingStarsBg color="#F00" count={1} />);
		recorder.drawFrame();

		const strokes = recorder.calls.filter((call) => call.startsWith("stroke("));
		expect(strokes).toHaveLength(4);
		expect(strokes[0]).toContain("rgba(255, 0, 0, 0.08)");
		expect(strokes[1]).toContain("rgba(255, 0, 0, 0.14)");
		expect(strokes[2]).toContain("rgba(255, 0, 0, 0.22)");
		expect(strokes[3]).toContain("rgba(255, 0, 0, 0.6)");
		expect(recorder.calls).toContain("fill(rgba(255, 0, 0, 1))");

		recorder.restore();
	});

	it("draws one dot per star", () => {
		const recorder = installCanvasRecorder();
		render(<FallingStarsBg count={5} />);
		recorder.drawFrame();

		const dots = recorder.calls.filter((call) => call.startsWith("arc("));
		expect(dots).toHaveLength(5);

		recorder.restore();
	});

	function frameOf(seed: number): string[] {
		const recorder = installCanvasRecorder();
		render(<FallingStarsBg count={4} seed={seed} />);
		recorder.drawFrame();
		const snapshot = [...recorder.calls];
		cleanup();
		recorder.restore();
		return snapshot;
	}

	// `Math.random()` would make the sky differ on every mount. A seed keeps a
	// remounted starfield identical and lets a second field on the same page opt
	// into a different one.
	it("flies the same sky for one seed and a different sky for another", () => {
		const first = frameOf(7);
		const same = frameOf(7);
		const other = frameOf(8);

		expect(first.length).toBeGreaterThan(0);
		expect(same).toEqual(first);
		expect(other).not.toEqual(first);
	});
});
