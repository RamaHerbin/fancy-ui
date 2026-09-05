import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { FlickeringGrid } from "./FlickeringGrid.js";
import { FakeIntersectionObserver } from "../../test-setup.js";

/**
 * jsdom has no 2D canvas: the shared test-setup stubs `getContext` to `null`,
 * exactly as the Svelte package's own setup does, so the mount effect returns
 * before it touches an observer. The transposed cases below inherit that stub
 * and assert markup only, like their Svelte originals.
 *
 * The canvas-lifecycle cases install a recording fake for the duration of one
 * test — the same "fake the browser API, drive it by hand" shape the shared
 * setup uses for IntersectionObserver — and restore it afterwards.
 */

interface FillCall {
	fillStyle: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

interface Canvas2dHarness {
	fills: FillCall[];
	clears: number;
}

/** A recording ResizeObserver, replacing the inert one from the shared setup. */
class RecordingResizeObserver {
	static instances: RecordingResizeObserver[] = [];

	readonly targets = new Set<Element>();
	disconnected = false;

	constructor(readonly callback: ResizeObserverCallback) {
		RecordingResizeObserver.instances.push(this);
	}

	observe(target: Element) {
		this.targets.add(target);
	}
	unobserve(target: Element) {
		this.targets.delete(target);
	}
	disconnect() {
		this.disconnected = true;
		this.targets.clear();
	}

	/** Report a resize for every observed element. */
	trigger() {
		this.callback([], this as unknown as ResizeObserver);
	}
}

/** Restores every global a test replaced, in reverse order. */
const restores: Array<() => void> = [];

function stubCanvas2d(): Canvas2dHarness {
	const harness: Canvas2dHarness = { fills: [], clears: 0 };
	const ctx = {
		fillStyle: "",
		clearRect() {
			harness.clears += 1;
		},
		fillRect(x: number, y: number, w: number, h: number) {
			harness.fills.push({ fillStyle: ctx.fillStyle, x, y, w, h });
		},
	};

	const original = HTMLCanvasElement.prototype.getContext;
	HTMLCanvasElement.prototype.getContext = (() =>
		ctx) as unknown as HTMLCanvasElement["getContext"];
	restores.push(() => {
		HTMLCanvasElement.prototype.getContext = original;
	});

	return harness;
}

function stubResizeObserver() {
	const original = globalThis.ResizeObserver;
	RecordingResizeObserver.instances = [];
	globalThis.ResizeObserver = RecordingResizeObserver as unknown as typeof ResizeObserver;
	restores.push(() => {
		globalThis.ResizeObserver = original;
	});
}

function stubRaf() {
	const originalRequest = globalThis.requestAnimationFrame;
	const originalCancel = globalThis.cancelAnimationFrame;
	let queue: FrameRequestCallback[] = [];
	const cancelled: number[] = [];
	let nextId = 0;

	globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
		queue.push(cb);
		return ++nextId;
	}) as typeof requestAnimationFrame;
	globalThis.cancelAnimationFrame = ((id: number) => {
		cancelled.push(id);
	}) as typeof cancelAnimationFrame;

	restores.push(() => {
		globalThis.requestAnimationFrame = originalRequest;
		globalThis.cancelAnimationFrame = originalCancel;
	});

	return {
		cancelled,
		get pending() {
			return queue.length;
		},
		/** Run the frames queued so far; anything they queue waits for the next flush. */
		flush(time: number) {
			const due = queue;
			queue = [];
			for (const cb of due) cb(time);
		},
	};
}

function stubDevicePixelRatio(value: number) {
	const original = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
	Object.defineProperty(window, "devicePixelRatio", { value, configurable: true });
	restores.push(() => {
		if (original) Object.defineProperty(window, "devicePixelRatio", original);
		else delete (window as unknown as Record<string, unknown>).devicePixelRatio;
	});
}

/** The observer watching the canvas — the last one constructed. */
function latestIntersectionObserver(): FakeIntersectionObserver {
	const observers = FakeIntersectionObserver.instances;
	return observers[observers.length - 1]!;
}

describe("FlickeringGrid", () => {
	afterEach(() => {
		cleanup();
		while (restores.length > 0) restores.pop()!();
	});

	it("renders a container div", () => {
		const { container } = render(<FlickeringGrid />);
		const div = container.querySelector("div");
		expect(div).toBeInTheDocument();
	});

	it("renders a canvas element inside the container", () => {
		const { container } = render(<FlickeringGrid />);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("canvas has pointer-events-none class", () => {
		const { container } = render(<FlickeringGrid />);
		const canvas = container.querySelector("canvas");
		expect(canvas?.className).toContain("pointer-events-none");
	});

	it("applies custom class names to the container", () => {
		const { container } = render(<FlickeringGrid className="my-grid" />);
		const div = container.querySelector("div");
		expect(div?.className).toContain("my-grid");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(<FlickeringGrid className="extra" />);
		const div = container.querySelector("div");
		expect(div?.className).toContain("w-full");
		expect(div?.className).toContain("h-full");
	});

	// --- Port-added coverage -------------------------------------------------
	// jsdom's `getContext` returns null (test-setup), so the five transposed
	// cases above never reach the observers or the frame loop. These three drive
	// it with a recording 2D context and a hand-stepped frame queue: the
	// observer wiring and the teardown the source's `onMount` cleanup performs,
	// the device-pixel-ratio scaling, and the `seed` prop this port adds in
	// place of the source's bare `Math.random()`.

	it("observes the container for resize and the canvas for intersection, and disconnects both on unmount", () => {
		stubCanvas2d();
		stubResizeObserver();
		const raf = stubRaf();

		const { container, unmount } = render(<FlickeringGrid width={40} height={20} />);
		const div = container.querySelector("div")!;
		const canvas = container.querySelector("canvas")!;

		const resize = RecordingResizeObserver.instances[0]!;
		const intersection = latestIntersectionObserver();
		expect(resize.targets.has(div)).toBe(true);
		expect(intersection.elements.has(canvas)).toBe(true);

		// Off-screen at mount: no frame is scheduled until the observer says so.
		expect(raf.pending).toBe(0);
		act(() => intersection.trigger(true));
		expect(raf.pending).toBe(1);

		unmount();
		expect(raf.cancelled.length).toBe(1);
		expect(resize.disconnected).toBe(true);
		expect(intersection.elements.size).toBe(0);
	});

	it("scales the backing store by the device pixel ratio and paints one rect per square", () => {
		const harness = stubCanvas2d();
		stubResizeObserver();
		const raf = stubRaf();
		stubDevicePixelRatio(2);

		const { container } = render(
			<FlickeringGrid width={40} height={20} squareSize={4} gridGap={6} color="#ff0000" />
		);
		const canvas = container.querySelector("canvas")! as HTMLCanvasElement;

		// 40 / (4 + 6) = 4 columns, 20 / (4 + 6) = 2 rows.
		expect(canvas.width).toBe(80);
		expect(canvas.height).toBe(40);
		expect(canvas.style.width).toBe("40px");
		expect(canvas.style.height).toBe("20px");

		act(() => latestIntersectionObserver().trigger(true));
		act(() => raf.flush(16));

		expect(harness.clears).toBe(1);
		expect(harness.fills.length).toBe(8);
		// Square size and offsets are all multiplied by the ratio.
		expect(harness.fills[0]).toMatchObject({ x: 0, y: 0, w: 8, h: 8 });
		expect(harness.fills[1]).toMatchObject({ x: 0, y: 20, w: 8, h: 8 });
		// No space before the opacity: `hexToRgba` returns the prefix
		// `"rgba(255, 0, 0,"` and the caller appends `${opacity})` — ported
		// verbatim, cosmetic quirk included, since CSS parses it either way.
		for (const fill of harness.fills) {
			expect(fill.fillStyle).toMatch(/^rgba\(255, 0, 0,[\d.e-]+\)$/);
		}

		// The loop keeps itself alive frame after frame.
		expect(raf.pending).toBe(1);
	});

	it("repeats the same flicker sequence for the same seed and a different one for another seed", () => {
		function sequenceFor(seed: number): string[] {
			const harness = stubCanvas2d();
			stubResizeObserver();
			const raf = stubRaf();

			const view = render(<FlickeringGrid width={200} height={100} seed={seed} />);
			act(() => latestIntersectionObserver().trigger(true));
			act(() => raf.flush(16));
			act(() => raf.flush(32));
			view.unmount();

			return harness.fills.map((fill) => fill.fillStyle);
		}

		const first = sequenceFor(7);
		const again = sequenceFor(7);
		const other = sequenceFor(8);

		// 20 columns x 10 rows, drawn twice.
		expect(first.length).toBe(400);
		expect(again).toEqual(first);
		expect(other).not.toEqual(first);
	});
});
