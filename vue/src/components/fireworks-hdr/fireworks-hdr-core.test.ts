import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFireworksHdr, type FireworksHdrEngine } from "./fireworks-hdr-core.js";
import { QUALITY, type FireworksHandle } from "./fireworks-shared.js";
import type { FireworksEngineHandle } from "./webgpu-renderer.js";

// One frame the mocked renderer saw, snapshotted (the core reuses a single
// uniforms object across frames, so the values must be copied on the spot).
interface FrameRecord {
	dt: number;
	liveCount: number;
	exposure: number;
	bufferLength: number;
}

const frames: FrameRecord[] = [];
let renderScaleCalls: number[] = [];
let destroyCalls = 0;
let fakeLost = false;

function makeFakeEngine(): FireworksEngineHandle {
	return {
		frame(dt, instanceData, liveCount, uniforms) {
			frames.push({
				dt,
				liveCount,
				exposure: uniforms.exposure,
				bufferLength: instanceData.length,
			});
		},
		resizeIfNeeded() {},
		setRenderScale(scale: number) {
			renderScaleCalls.push(scale);
		},
		extendedToneMapping: true,
		renderLevel: "webgpu-hdr",
		get lost() {
			return fakeLost;
		},
		instanceCapacity: 4096,
		destroy() {
			destroyCalls++;
		},
	} as FireworksEngineHandle;
}

// jsdom has no GPU. The only way to reach the activated code paths is to hand
// the core a stand-in renderer; the factory is only called when `navigator.gpu`
// exists, so tests that never fake it keep exercising the no-renderer path.
vi.mock("./webgpu-renderer.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./webgpu-renderer.js")>();
	return {
		...actual,
		startWebGpuFireworks: vi.fn(async (): Promise<FireworksEngineHandle> => makeFakeEngine()),
	};
});

/** Pretend a WebGPU adapter exists for the duration of one test. */
function withFakeGpu(): () => void {
	Object.defineProperty(navigator, "gpu", { value: {}, configurable: true });
	return () => {
		Reflect.deleteProperty(navigator, "gpu");
	};
}

// --- a hand-cranked rAF clock -------------------------------------------
let rafQueue: { id: number; cb: FrameRequestCallback }[] = [];
let nextRafId = 1;
let cancelSpy: ReturnType<typeof vi.fn>;

function pumpFrame(now: number): boolean {
	const next = rafQueue.shift();
	if (!next) return false;
	next.cb(now);
	return true;
}

function makeCanvas(): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	document.body.appendChild(canvas);
	return canvas;
}

let created: FireworksHdrEngine | null = null;
let canvas: HTMLCanvasElement | null = null;

beforeEach(() => {
	frames.length = 0;
	renderScaleCalls = [];
	destroyCalls = 0;
	fakeLost = false;
	rafQueue = [];
	nextRafId = 1;
	cancelSpy = vi.fn((id: number) => {
		rafQueue = rafQueue.filter((f) => f.id !== id);
	});
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
		const id = nextRafId++;
		rafQueue.push({ id, cb });
		return id;
	});
	vi.stubGlobal("cancelAnimationFrame", cancelSpy);
});

afterEach(() => {
	created?.destroy();
	created = null;
	canvas?.remove();
	canvas = null;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

/** Boot the core against the stand-in WebGPU renderer and wait for activation. */
async function bootActivated(
	options: Parameters<typeof createFireworksHdr>[1] = {},
	random?: () => number
): Promise<{ engine: FireworksHdrEngine; handle: FireworksHandle; restoreGpu: () => void }> {
	const restoreGpu = withFakeGpu();
	const handles: FireworksHandle[] = [];
	canvas = makeCanvas();
	const engine = createFireworksHdr(
		{ canvas },
		{ quality: "high", ...options, onReady: (h) => handles.push(h) },
		random
	);
	expect(engine).not.toBeNull();
	created = engine;
	await vi.waitFor(() => expect(handles.length).toBeGreaterThan(0));
	return { engine: engine!, handle: handles[0]!, restoreGpu };
}

describe("createFireworksHdr — construction", () => {
	it("returns null when there is no canvas to draw into", () => {
		expect(createFireworksHdr({ canvas: null as unknown as HTMLCanvasElement })).toBeNull();
	});

	it("boots silently when no GPU context is available (jsdom getContext → null)", async () => {
		// No `navigator.gpu` and `getContext` stubbed to null by the test setup, so
		// neither renderer comes up: the engine object exists but never activates
		// and `onReady` is never fired — the component's published fail-quiet
		// contract (the caller's own timeout owns the static fallback).
		const onReady = vi.fn();
		const onLost = vi.fn();
		canvas = makeCanvas();
		created = createFireworksHdr({ canvas }, { onReady, onLost });
		expect(created).not.toBeNull();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(onReady).not.toHaveBeenCalled();
		expect(onLost).not.toHaveBeenCalled();
		expect(rafQueue).toHaveLength(0);
	});

	it("boots nothing at all when hdr is false", async () => {
		const restoreGpu = withFakeGpu();
		try {
			const onReady = vi.fn();
			canvas = makeCanvas();
			created = createFireworksHdr({ canvas }, { hdr: false, onReady });
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(onReady).not.toHaveBeenCalled();
		} finally {
			restoreGpu();
		}
	});

	it("hands out a handle whose renderLevel is the engine that came up", async () => {
		const { handle, restoreGpu } = await bootActivated();
		try {
			expect(handle.renderLevel).toBe("webgpu-hdr");
			expect(typeof handle.launch).toBe("function");
			expect(typeof handle.cleanup).toBe("function");
		} finally {
			restoreGpu();
		}
	});
});

describe("createFireworksHdr — loop and teardown", () => {
	it("drives a rAF loop once activated and cancels it on destroy", async () => {
		const { engine, restoreGpu } = await bootActivated();
		try {
			expect(rafQueue.length).toBe(1);
			const base = performance.now();
			pumpFrame(base);
			// The loop re-arms itself every frame.
			expect(rafQueue.length).toBe(1);
			expect(frames.length).toBe(1);
			engine.destroy();
			expect(cancelSpy).toHaveBeenCalled();
			expect(rafQueue.length).toBe(0);
			// A stale callback fired after destroy must not draw.
			const before = frames.length;
			pumpFrame(base + 16);
			expect(frames.length).toBe(before);
		} finally {
			restoreGpu();
		}
	});

	it("destroy is idempotent and releases the renderer exactly once", async () => {
		const { engine, restoreGpu } = await bootActivated();
		try {
			engine.destroy();
			expect(destroyCalls).toBe(1);
			expect(() => engine.destroy()).not.toThrow();
			expect(() => engine.destroy()).not.toThrow();
			expect(destroyCalls).toBe(1);
		} finally {
			restoreGpu();
		}
	});

	it("resize is safe before activation and after destroy", async () => {
		canvas = makeCanvas();
		created = createFireworksHdr({ canvas }, {});
		expect(() => created!.resize()).not.toThrow();
		created!.destroy();
		expect(() => created!.resize()).not.toThrow();
	});

	it("resize is safe on a live engine", async () => {
		const { engine, restoreGpu } = await bootActivated();
		try {
			expect(() => engine.resize()).not.toThrow();
			engine.destroy();
			expect(() => engine.resize()).not.toThrow();
		} finally {
			restoreGpu();
		}
	});

	it("arms the window pointerdown listener only when interactive, and removes it on destroy", async () => {
		const addSpy = vi.spyOn(window, "addEventListener");
		const removeSpy = vi.spyOn(window, "removeEventListener");
		const pointerdown = (spy: typeof addSpy) =>
			spy.mock.calls.some((call) => call[0] === "pointerdown");

		const off = await bootActivated({ interactive: false });
		try {
			expect(pointerdown(addSpy)).toBe(false);
			off.engine.destroy();
		} finally {
			off.restoreGpu();
		}

		const on = await bootActivated({ interactive: true });
		try {
			expect(pointerdown(addSpy)).toBe(true);
			on.engine.destroy();
			expect(pointerdown(removeSpy)).toBe(true);
		} finally {
			on.restoreGpu();
		}
	});
});

describe("createFireworksHdr — setOptions", () => {
	it("applies exposure, clamped to [1,4]", async () => {
		const { engine, restoreGpu } = await bootActivated({ exposure: 2.2 });
		try {
			const base = performance.now();
			pumpFrame(base);
			expect(frames[0]!.exposure).toBeCloseTo(2.2, 6);

			engine.setOptions({ exposure: 99 });
			pumpFrame(base + 16);
			expect(frames[1]!.exposure).toBe(4);

			engine.setOptions({ exposure: 0 });
			pumpFrame(base + 32);
			expect(frames[2]!.exposure).toBe(1);

			engine.setOptions({ exposure: Number.NaN });
			pumpFrame(base + 48);
			expect(frames[3]!.exposure).toBe(1);
		} finally {
			restoreGpu();
		}
	});

	it("the onReady handle drives the same live options", async () => {
		const { handle, restoreGpu } = await bootActivated({ exposure: 2.2 });
		try {
			const base = performance.now();
			handle.setExposure(3.5);
			pumpFrame(base);
			expect(frames[0]!.exposure).toBe(3.5);
			expect(() => handle.setKeepClear(null)).not.toThrow();
			expect(() => handle.setKeepClear({ x0: 0, y0: 0, x1: 1, y1: 1 })).not.toThrow();
			expect(() => handle.setAmbient(false)).not.toThrow();
			expect(() => handle.setAmbient(true, 0.8)).not.toThrow();
		} finally {
			restoreGpu();
		}
	});

	it("visible=false pauses the loop and visible=true resumes it", async () => {
		const { engine, restoreGpu } = await bootActivated();
		try {
			const base = performance.now();
			pumpFrame(base);
			expect(frames.length).toBe(1);

			engine.setOptions({ visible: false });
			expect(rafQueue.length).toBe(0);
			expect(cancelSpy).toHaveBeenCalled();

			engine.setOptions({ visible: true });
			expect(rafQueue.length).toBe(1);
			pumpFrame(base + 16);
			expect(frames.length).toBe(2);
		} finally {
			restoreGpu();
		}
	});

	it("ignores mount-only keys (they are not part of LiveOptions)", async () => {
		const { engine, restoreGpu } = await bootActivated({ quality: "high" });
		try {
			const base = performance.now();
			pumpFrame(base);
			const highBuffer = frames[0]!.bufferLength;
			// `quality` is a mount-time snapshot: pushing a new one through
			// setOptions must not resize the instance buffer behind the caller.
			engine.setOptions({ quality: "low" } as never);
			pumpFrame(base + 16);
			expect(frames[1]!.bufferLength).toBe(highBuffer);
		} finally {
			restoreGpu();
		}
	});
});

describe("createFireworksHdr — preserved invariants", () => {
	it("sizes the instance buffer to the resolved tier capacity × 8 floats", async () => {
		const { restoreGpu } = await bootActivated({ quality: "high" });
		try {
			pumpFrame(performance.now());
			expect(frames[0]!.bufferLength).toBe(QUALITY.high.maxParticles * 8);
		} finally {
			restoreGpu();
		}
	});

	it("clamps dt to 0.05 s after a long gap (tab switch guard)", async () => {
		const { restoreGpu } = await bootActivated();
		try {
			const base = performance.now();
			pumpFrame(base);
			pumpFrame(base + 10_000);
			expect(frames[1]!.dt).toBe(0.05);
		} finally {
			restoreGpu();
		}
	});

	it("runs the ambient scheduler on its Poisson cadence", async () => {
		// A constant rng pins poissonIntervalMs(2200, …, 900, 5200) at
		// -2200·ln(0.5) ≈ 1524.8 ms, so the first ambient shell must have flown
		// well before 60 frames of the clamped 50 ms maximum step.
		const { restoreGpu } = await bootActivated({ ambient: true }, () => 0.5);
		try {
			const base = performance.now();
			for (let i = 0; i <= 60; i++) pumpFrame(base + i * 50);
			expect(frames.some((f) => f.liveCount > 0)).toBe(true);
		} finally {
			restoreGpu();
		}
	});

	it("reducedMotion pins the ambient scheduler off, and the handle cannot re-arm it", async () => {
		const { handle, restoreGpu } = await bootActivated(
			{ ambient: true, reducedMotion: true },
			() => 0.5
		);
		try {
			const base = performance.now();
			handle.setAmbient(true, 1);
			for (let i = 0; i <= 60; i++) pumpFrame(base + i * 50);
			expect(frames.every((f) => f.liveCount === 0)).toBe(true);
		} finally {
			restoreGpu();
		}
	});

	it("ambient=false launches nothing, but an explicit launch still flies", async () => {
		const { handle, restoreGpu } = await bootActivated({ ambient: false }, () => 0.5);
		try {
			const base = performance.now();
			for (let i = 0; i <= 60; i++) pumpFrame(base + i * 50);
			expect(frames.every((f) => f.liveCount === 0)).toBe(true);

			const res = handle.launch({ apex: { x: 0.5, y: 0.4 }, shell: "peony" });
			expect(res.breakMs).toBeGreaterThan(0);
			pumpFrame(base + 61 * 50);
			expect(frames[frames.length - 1]!.liveCount).toBeGreaterThan(0);
		} finally {
			restoreGpu();
		}
	});

	it("a lost context is recovered once, then reported through onLost", async () => {
		const restoreGpu = withFakeGpu();
		try {
			const onLost = vi.fn();
			const handles: FireworksHandle[] = [];
			canvas = makeCanvas();
			created = createFireworksHdr(
				{ canvas },
				{ quality: "high", onLost, onReady: (h) => handles.push(h) }
			);
			await vi.waitFor(() => expect(handles).toHaveLength(1));

			// First loss: the WebGPU path asks for a fresh device straight away.
			fakeLost = true;
			pumpFrame(performance.now());
			await vi.waitFor(() => expect(handles).toHaveLength(2));

			// Second loss: the single recovery is spent, so the engine gives up.
			pumpFrame(performance.now() + 16);
			await vi.waitFor(() => expect(onLost).toHaveBeenCalledTimes(1));
		} finally {
			restoreGpu();
		}
	});
});
