import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BAYER,
	GLOW_PEAK,
	INK_ALPHA_DAY,
	INK_ALPHA_NIGHT,
	LENS_BOOST,
	LIT_GLOW,
	MAX_BACKING_PX,
	WAVE_HALO_CELLS,
	WAVE_MS,
	WAVE_PALETTE,
	backingDpr,
	bayer,
	cellOrigin,
	clearGrid,
	composeWave,
	createGrid,
	createLens,
	createPixelScene,
	cssOf,
	easeInOutCubic,
	effectiveCell,
	encodeExt,
	grad,
	hash,
	inLens,
	mixHex,
	paintGrid,
	parseColour,
	pixelHalos,
	srgbToLinear,
	stepLens,
	waveCover,
	waveGlow,
	writeCell,
	type PixelGrid,
	type PixelSceneFrame,
} from "./pixel-scene-core.js";

// --- recording 2D context ----------------------------------------------------

interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
	style: unknown;
	alpha: number;
}

function recordingCtx() {
	const rects: Rect[] = [];
	const ctx = {
		fillStyle: "" as unknown,
		globalAlpha: 1,
		canvas: { width: 100, height: 100 },
		setTransform: vi.fn(),
		clearRect: vi.fn(),
		fillRect(x: number, y: number, w: number, h: number) {
			rects.push({ x, y, w, h, style: ctx.fillStyle, alpha: ctx.globalAlpha });
		},
	};
	return { ctx: ctx as unknown as CanvasRenderingContext2D, rects };
}

const closedLens = () => createLens();

describe("pure helpers", () => {
	it("hash is deterministic, in [0, 1) and spread out", () => {
		expect(hash(3, 4, 5)).toBe(hash(3, 4, 5));
		const seen = new Set<number>();
		let lo = 0;
		for (let x = 0; x < 50; x++)
			for (let y = 0; y < 50; y++) {
				const v = hash(x, y, 7);
				expect(v).toBeGreaterThanOrEqual(0);
				expect(v).toBeLessThan(1);
				seen.add(Math.floor(v * 10));
				if (v < 0.5) lo++;
			}
		expect(seen.size).toBe(10);
		expect(lo / 2500).toBeGreaterThan(0.4);
		expect(lo / 2500).toBeLessThan(0.6);
	});

	it("bayer covers the 16 levels, negative coordinates included", () => {
		const levels = new Set<number>();
		for (let y = -4; y < 4; y++) for (let x = -4; x < 4; x++) levels.add(bayer(x, y));
		expect(levels.size).toBe(16);
		expect(BAYER).toHaveLength(16);
		expect(bayer(-1, -1)).toBe(bayer(3, 3));
	});

	it("parses and mixes packed colours", () => {
		expect(parseColour("#ff8000")).toBe(0xff8000);
		expect(parseColour("#f80")).toBe(0xff8800);
		expect(parseColour("rgb(1, 2, 3)")).toBe(0x010203);
		expect(parseColour(0x123456)).toBe(0x123456);
		expect(parseColour("nope")).toBe(-1);
		expect(mixHex("#000000", "#ffffff", 0.5)).toBe(0x7f7f7f);
		expect(
			grad(
				[
					[0, "#000000"],
					[1, "#ff0000"],
				],
				1
			)
		).toBe(0xff0000);
		expect(
			grad(
				[
					[0, "#000000"],
					[1, "#ff0000"],
				],
				-1
			)
		).toBe(0);
		expect(cssOf(0x0a0b0c)).toBe("#0a0b0c");
	});

	it("encodeExt inverts srgbToLinear for every 8-bit value", () => {
		for (let c = 0; c < 256; c++) expect(encodeExt(srgbToLinear(c))).toBeCloseTo(c / 255, 5);
		expect(encodeExt(4.9)).toBeGreaterThan(1.9);
	});
});

describe("writeCell", () => {
	it("ignores out-of-bounds cells", () => {
		const g = createGrid(4, 3);
		writeCell(g, -1, 0, "#fff", 1, true);
		writeCell(g, 4, 0, "#fff", 1, true);
		writeCell(g, 0, 3, "#fff", 1, true);
		expect([...g.color].every((c) => c === -1)).toBe(true);
	});

	it("applies the lit grammar and clamps glow to the peak", () => {
		const g = createGrid(4, 1);
		writeCell(g, 0, 0, "#ffffff", 0.5, false);
		writeCell(g, 1, 0, "#ffffff", 0.5, true);
		writeCell(g, 2, 0, "#ffffff", 0.5, 2.5);
		writeCell(g, 3, 0, "#ffffff", 0.5, 9);
		expect([...g.glow]).toEqual([0, LIT_GLOW, 2.5, expect.closeTo(GLOW_PEAK, 5)]);
		expect([...g.lit]).toEqual([0, 1, 1, 1]);
	});

	it("registers an emitter only for a numeric lit with a halo", () => {
		const g = createGrid(4, 1);
		writeCell(g, 0, 0, "#fff", 0, true, 2);
		writeCell(g, 1, 0, "#fff", 0, 3, 0);
		writeCell(g, 2, 0, "#fff", 0, 3, 1.5);
		expect(g.emitters).toEqual([2, 0, 0xffffff, 3, 1.5]);
	});
});

describe("pixelHalos", () => {
	function lit(): PixelGrid {
		const g = createGrid(21, 21);
		for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) writeCell(g, x, y, "#000000");
		writeCell(g, 10, 10, "#ffcc00", 0.9, 4, 3);
		pixelHalos(g);
		return g;
	}

	it("never overwrites the emitter and stays below it", () => {
		const g = lit();
		const e = 10 * 21 + 10;
		expect(g.glow[e]).toBe(4);
		expect(g.hcol[e]).toBe(-1);
		let halo = 0;
		for (let i = 0; i < g.glow.length; i++)
			if (i !== e && g.glow[i]! > 0) {
				halo++;
				expect(g.glow[i]).toBeLessThan(4);
				expect(g.hcol[i]).toBe(0xffcc00);
			}
		expect(halo).toBeGreaterThan(4);
	});

	it("thins out with distance", () => {
		const g = lit();
		const ring = (r0: number, r1: number) => {
			let on = 0;
			let all = 0;
			for (let y = 0; y < 21; y++)
				for (let x = 0; x < 21; x++) {
					const d = Math.hypot(x - 10, y - 10);
					if (d < r0 || d >= r1) continue;
					all++;
					if (g.glow[y * 21 + x]! > 0) on++;
				}
			return on / all;
		};
		expect(ring(1, 2.5)).toBeGreaterThan(ring(2.5, 4.5));
		expect(ring(2.5, 4.5)).toBeGreaterThan(ring(4.5, 6.6));
	});
});

describe("lens", () => {
	it("is frame-rate independent", () => {
		const a = createLens();
		const b = createLens();
		for (const l of [a, b]) Object.assign(l, { x: 0, y: 0, r: 0, tx: 40, ty: 20, tr: 21 });
		stepLens(a, 8.3335, false);
		stepLens(a, 8.3335, false);
		stepLens(b, 16.667, false);
		expect(a.x).toBeCloseTo(b.x, 6);
		expect(a.y).toBeCloseTo(b.y, 6);
		expect(a.r).toBeCloseTo(b.r, 6);
	});

	it("snaps, and reports when it settles", () => {
		const l = createLens();
		Object.assign(l, { x: 0, y: 0, r: 0, tx: 5, ty: 6, tr: 21 });
		expect(stepLens(l, 16, true)).toBe(false);
		expect([l.x, l.y, l.r]).toEqual([5, 6, 21]);
		l.tx = 30;
		let n = 0;
		while (stepLens(l, 16.667, false)) n++;
		expect(n).toBeGreaterThan(3);
		expect(l.x).toBe(30);
	});

	it("dithers its rim", () => {
		const l = createLens();
		Object.assign(l, { x: 20.5, y: 20.5, r: 10 });
		expect(inLens(l, 20, 20)).toBe(true);
		expect(inLens(l, 20, 34)).toBe(false);
		let rim = 0;
		for (let x = 0; x < 41; x++)
			for (let y = 0; y < 41; y++) {
				const d = Math.hypot(x - 20, y - 20);
				if (d > 8.5 && d < 11.5 && inLens(l, x, y)) rim++;
			}
		expect(rim).toBeGreaterThan(0);
		l.r = 0.4;
		expect(inLens(l, 20, 20)).toBe(false);
	});
});

describe("effectiveCell", () => {
	it("keeps the cell under the cap and grows it on big boxes", () => {
		expect(effectiveCell(1600, 900, 5, 4)).toEqual({ cell: 5, dot: 4 });
		expect(effectiveCell(1920, 1080, 5, 4).cell).toBe(6);
		const big = effectiveCell(2560, 1440, 5, 4);
		expect(big.cell).toBe(8);
		expect(big.dot).toBe(6);
		expect(effectiveCell(100, 100, 1, 9)).toEqual({ cell: 4, dot: 4 });
		expect(effectiveCell(100, 100, 99, 0)).toEqual({ cell: 32, dot: 1 });
	});
});

describe("backingDpr", () => {
	it("drops to DPR 1 past the backing budget only", () => {
		expect(backingDpr(822, 340, 2)).toBe(2);
		expect(backingDpr(1600, 900, 2)).toBe(1);
		expect(backingDpr(2560, 1440, 2)).toBe(1);
		expect(backingDpr(2560, 1440, 1)).toBe(1);
		expect(backingDpr(1000, 1000, 1.5)).toBe(1.5);
		expect(1449 * 1449 * 4).toBeGreaterThan(MAX_BACKING_PX);
		expect(backingDpr(1449, 1449, 2)).toBe(1);
		expect(backingDpr(100, 100, Number.NaN)).toBe(1);
	});
});

describe("paintGrid", () => {
	const base = { cell: 5, dot: 4, dpr: 1, ink: "#141414", night: false };

	it("draws ink outside the lens at ×0.85 by day and ×0.6 at night", () => {
		const g = createGrid(2, 1);
		writeCell(g, 0, 0, "#ff0000", 0.5);
		for (const night of [false, true]) {
			const { ctx, rects } = recordingCtx();
			paintGrid(ctx, g, closedLens(), { ...base, night });
			expect(rects).toHaveLength(1);
			expect(rects[0]!.style).toBe("#141414");
			expect(rects[0]!.alpha).toBeCloseTo(0.5 * (night ? INK_ALPHA_NIGHT : INK_ALPHA_DAY), 6);
		}
	});

	it("draws lit cells in colour at alpha 1 and skips empty cells", () => {
		const g = createGrid(3, 1);
		writeCell(g, 0, 0, "#00ff00", 0, true);
		writeCell(g, 1, 0, "#0000ff", 0);
		const { ctx, rects } = recordingCtx();
		paintGrid(ctx, g, closedLens(), base);
		expect(rects).toEqual([{ x: 0, y: 0, w: 4, h: 4, style: "#00ff00", alpha: 1 }]);
	});

	it("shows lens cells in colour and boosts their glow", () => {
		const g = createGrid(10, 10);
		for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) writeCell(g, x, y, "#336699", 0);
		writeCell(g, 5, 5, "#ffffff", 0, 3);
		const lens = createLens();
		Object.assign(lens, { x: 5.5, y: 5.5, r: 4 });
		const { ctx, rects } = recordingCtx();
		paintGrid(ctx, g, lens, base);
		expect(rects.length).toBeGreaterThan(4);
		expect(rects.every((r) => r.alpha === 1)).toBe(true);
		expect(g.glow[4 * 10 + 5]).toBeCloseTo(LENS_BOOST, 5);
		expect(g.glow[5 * 10 + 5]).toBe(3);
		expect(g.glow[0]).toBe(0);
	});

	it("does not boost lens cells inside the copy corner", () => {
		const g = createGrid(10, 10);
		for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) writeCell(g, x, y, "#336699", 0);
		g.copyW = 5;
		g.copyH = 5;
		const lens = createLens();
		Object.assign(lens, { x: 5, y: 5, r: 4 });
		const { ctx, rects } = recordingCtx();
		paintGrid(ctx, g, lens, base);
		expect(rects.length).toBeGreaterThan(4);
		expect(g.glow[4 * 10 + 4]).toBe(0);
		expect(g.glow[5 * 10 + 5]).toBeCloseTo(LENS_BOOST, 5);
		clearGrid(g);
		expect([g.copyW, g.copyH]).toEqual([0, 0]);
	});

	it("rounds origins and sizes in device pixels", () => {
		const g = createGrid(3, 2);
		for (let x = 0; x < 3; x++) writeCell(g, x, 1, "#fff", 0, true);
		for (const dpr of [1.5, 2]) {
			const { ctx, rects } = recordingCtx();
			paintGrid(ctx, g, closedLens(), { ...base, dpr });
			expect(rects.map((r) => r.x)).toEqual([0, 1, 2].map((x) => cellOrigin(x, 5, dpr)));
			expect(rects.every((r) => r.w === Math.round(4 * dpr) && r.y === Math.round(5 * dpr))).toBe(
				true
			);
		}
		expect(cellOrigin(3, 5, 1.5)).toBe(23);
	});
});

// --- engine ------------------------------------------------------------------

describe("createPixelScene", () => {
	let rafs: FrameRequestCallback[] = [];
	let nextId = 0;
	const ioInstances: { cb: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] =
		[];
	const roInstances: { disconnect: ReturnType<typeof vi.fn> }[] = [];

	class IO {
		disconnect = vi.fn();
		observe = vi.fn();
		constructor(public cb: IntersectionObserverCallback) {
			ioInstances.push(this);
		}
	}
	class RO {
		disconnect = vi.fn();
		observe = vi.fn();
		constructor(public cb: ResizeObserverCallback) {
			roInstances.push(this);
		}
	}

	beforeEach(() => {
		rafs = [];
		ioInstances.length = 0;
		roInstances.length = 0;
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn((cb: FrameRequestCallback) => {
				rafs.push(cb);
				return ++nextId;
			})
		);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
		vi.stubGlobal("IntersectionObserver", IO);
		vi.stubGlobal("ResizeObserver", RO);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function run(now: number) {
		const cbs = rafs.splice(0);
		for (const cb of cbs) cb(now);
		return cbs.length;
	}

	function setup(opts: Record<string, unknown> = {}) {
		const { ctx, rects } = recordingCtx();
		const host = document.createElement("div");
		Object.defineProperty(host, "clientWidth", { value: 50 });
		Object.defineProperty(host, "clientHeight", { value: 30 });
		const canvas = document.createElement("canvas");
		canvas.getContext = vi.fn(() => ctx) as never;
		canvas.getBoundingClientRect = () =>
			({ left: 0, top: 0, width: 50, height: 30, right: 50, bottom: 30 }) as DOMRect;
		host.appendChild(canvas);
		const times: number[] = [];
		const painter = vi.fn((t: number, g: PixelGrid) => {
			times.push(t);
			for (let i = 0; i < g.color.length; i++) {
				g.color[i] = 0x336699;
				g.inkA[i] = 0.5;
			}
		});
		const engine = createPixelScene({ host, canvas }, { painter, reducedMotion: false, ...opts });
		return { engine: engine!, painter, times, host, canvas, rects };
	}

	it("returns null without a 2D context", () => {
		const canvas = document.createElement("canvas");
		canvas.getContext = vi.fn(() => null) as never;
		expect(
			createPixelScene({ host: document.createElement("div"), canvas }, { painter: () => {} })
		).toBeNull();
	});

	it("sizes the grid and backing store from the host", () => {
		const { canvas, painter } = setup();
		run(16);
		expect(canvas.width).toBe(50);
		expect(painter).toHaveBeenCalledTimes(1);
		const g = painter.mock.calls[0]![1];
		expect([g.cols, g.rows]).toEqual([10, 6]);
	});

	it("animates while visible and sleeps off-screen, hidden or paused", () => {
		const { engine, times } = setup();
		run(16);
		run(32);
		expect(times[1]).toBeGreaterThan(times[0]!);
		ioInstances[0]!.cb(
			[{ isIntersecting: false } as IntersectionObserverEntry],
			{} as IntersectionObserver
		);
		run(48);
		expect(rafs).toHaveLength(0);
		ioInstances[0]!.cb(
			[{ isIntersecting: true } as IntersectionObserverEntry],
			{} as IntersectionObserver
		);
		expect(rafs).toHaveLength(1);
		engine.setOptions({ paused: true });
		run(64);
		run(80);
		run(96);
		expect(rafs).toHaveLength(0);
		const frozen = times[times.length - 1];
		// A night change still plays its wave while paused, scene clock frozen, then sleeps.
		engine.setOptions({ night: true });
		run(112);
		expect(rafs).toHaveLength(1);
		run(112 + WAVE_MS + 16);
		run(112 + WAVE_MS + 32);
		expect(times.every((t, i) => i < 2 || t === frozen)).toBe(true);
		expect(rafs).toHaveLength(0);
		engine.setOptions({ wave: false, night: false });
		run(2000);
		expect(rafs).toHaveLength(0);
		engine.destroy();
	});

	it("plays a night change as a wave from the sun, painting both themes, then settles", () => {
		const nights: boolean[] = [];
		const { ctx } = recordingCtx();
		const host = document.createElement("div");
		Object.defineProperty(host, "clientWidth", { value: 200 });
		Object.defineProperty(host, "clientHeight", { value: 100 });
		const canvas = document.createElement("canvas");
		canvas.getContext = vi.fn(() => ctx) as never;
		const frames: PixelSceneFrame[] = [];
		const painter = vi.fn((_t: number, g: PixelGrid, night: boolean) => {
			nights.push(night);
			g.sunX = 30.5;
			g.sunY = 4.5;
			for (let i = 0; i < g.color.length; i++) {
				g.color[i] = night ? 0x112233 : 0xddeeff;
				g.inkA[i] = 0.5;
			}
		});
		const engine = createPixelScene(
			{ host, canvas },
			{
				painter,
				reducedMotion: false,
				onFrame: (f) => frames.push({ ...f, color: f.color.slice() }),
			}
		)!;
		run(16);
		nights.length = 0;
		engine.setOptions({ night: true });
		run(32); // wave starts
		run(32 + WAVE_MS / 2);
		expect(nights).toContain(false);
		expect(nights).toContain(true);
		const mid = frames.at(-1)!;
		const at = (x: number, y: number) => mid.color[y * mid.cols + x];
		expect(at(30, 4)).toBe(0x112233); // the sun has turned
		expect(at(0, mid.rows - 1)).toBe(0xddeeff); // the far corner has not
		expect(WAVE_PALETTE).toContain([...mid.color].find((c) => WAVE_PALETTE.includes(c)) ?? -1); // halo cells on the front
		run(32 + WAVE_MS + 16);
		run(32 + WAVE_MS + 32);
		const done = frames.at(-1)!;
		expect([...done.color].every((c) => c === 0x112233)).toBe(true);
		engine.destroy();
	});

	it("switches at once under reduced motion or with wave off", () => {
		for (const opts of [{ reducedMotion: true }, { wave: false }]) {
			const nights: boolean[] = [];
			const { engine } = setup({
				...opts,
				painter: (_t: number, _g: PixelGrid, night: boolean) => nights.push(night),
			});
			run(16);
			nights.length = 0;
			engine.setOptions({ night: true });
			run(32);
			expect(nights).toEqual([true]);
			engine.destroy();
		}
	});

	it("does not loop under reduced motion: one paint per pointer event, time frozen", () => {
		const { host, times } = setup({ reducedMotion: true });
		run(16);
		expect(rafs).toHaveLength(0);
		host.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: 20, clientY: 10 }));
		expect(run(32)).toBe(1);
		expect(rafs).toHaveLength(0);
		host.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: 30, clientY: 10 }));
		run(48);
		expect(rafs).toHaveLength(0);
		expect(times.every((t) => t === 0)).toBe(true);
	});

	it("hands live buffers to onFrame and drops a throwing hook", () => {
		const frames: PixelSceneFrame[] = [];
		const { engine, rects } = setup();
		engine.setOptions({ onFrame: (f) => frames.push({ ...f }) });
		run(16);
		expect(frames).toHaveLength(1);
		expect(frames[0]!.cols).toBe(10);
		expect(frames[0]!.color[0]).toBe(0x336699);
		const bad = vi.fn(() => {
			throw new Error("boom");
		});
		engine.setOptions({ onFrame: bad });
		run(32);
		const painted = rects.length;
		run(48);
		expect(bad).toHaveBeenCalledTimes(1);
		expect(rects.length).toBeGreaterThan(painted);
	});

	it("caps the backing store and marks it pixelated, without relayouting every tick", () => {
		vi.stubGlobal("devicePixelRatio", 2);
		const { ctx } = recordingCtx();
		const host = document.createElement("div");
		Object.defineProperty(host, "clientWidth", { value: 1600 });
		Object.defineProperty(host, "clientHeight", { value: 900 });
		const canvas = document.createElement("canvas");
		canvas.getContext = vi.fn(() => ctx) as never;
		const frames: PixelSceneFrame[] = [];
		const engine = createPixelScene(
			{ host, canvas },
			{ painter: () => {}, reducedMotion: false, onFrame: (f) => frames.push({ ...f }) }
		)!;
		run(16);
		expect([canvas.width, canvas.height]).toEqual([1600, 900]);
		expect(frames[0]!.dpr).toBe(1);
		expect(frames[0]!.pixelated).toBe(true);
		const set = vi.spyOn(canvas, "width", "set");
		run(32);
		run(48);
		expect(set).not.toHaveBeenCalled();
		engine.destroy();
	});

	describe("currentColor ink while asleep", () => {
		let colour = "rgb(1, 6, 24)";
		beforeEach(() => {
			colour = "rgb(1, 6, 24)";
			vi.stubGlobal("getComputedStyle", () => ({ color: colour }));
		});
		afterEach(() => {
			document.documentElement.className = "";
			vi.useRealTimers();
		});
		const inkOf = (rects: Rect[]) => rects.filter((r) => r.alpha < 1).map((r) => r.style);

		it("repaints once on a theme class change on <html>", async () => {
			const { engine, rects, painter } = setup({ reducedMotion: true });
			run(16);
			expect(painter).toHaveBeenCalledTimes(1);
			expect(inkOf(rects).every((s) => s === "rgb(1, 6, 24)")).toBe(true);
			colour = "rgb(248, 251, 252)";
			document.documentElement.classList.add("dark");
			await Promise.resolve();
			const before = rects.length;
			run(32);
			expect(painter).toHaveBeenCalledTimes(2);
			expect(inkOf(rects.slice(before)).every((s) => s === "rgb(248, 251, 252)")).toBe(true);
			run(48);
			expect(painter).toHaveBeenCalledTimes(2);
			// an attribute change that leaves the colour alone does not repaint
			document.documentElement.classList.add("other");
			await Promise.resolve();
			run(64);
			expect(painter).toHaveBeenCalledTimes(2);
			engine.destroy();
			colour = "rgb(0, 0, 0)";
			document.documentElement.classList.remove("dark");
			await Promise.resolve();
			run(80);
			expect(painter).toHaveBeenCalledTimes(2);
		});

		it("polls slowly while paused and stops when destroyed or with a hex ink", () => {
			vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
			const { engine, painter } = setup({ paused: true });
			run(16);
			expect(painter).toHaveBeenCalledTimes(1);
			vi.advanceTimersByTime(600);
			run(24);
			expect(painter).toHaveBeenCalledTimes(1);
			colour = "rgb(248, 251, 252)";
			vi.advanceTimersByTime(600);
			run(32);
			expect(painter).toHaveBeenCalledTimes(2);
			engine.setOptions({ ink: "#336699" });
			run(48);
			expect(painter).toHaveBeenCalledTimes(3);
			colour = "rgb(9, 9, 9)";
			vi.advanceTimersByTime(2000);
			run(56);
			expect(painter).toHaveBeenCalledTimes(3);
			engine.setOptions({ ink: "currentColor" });
			run(64);
			expect(painter).toHaveBeenCalledTimes(4);
			engine.destroy();
			colour = "rgb(1, 1, 1)";
			vi.advanceTimersByTime(2000);
			run(72);
			expect(painter).toHaveBeenCalledTimes(4);
		});
	});

	it("destroy removes listeners and observers", () => {
		const { engine, host, painter } = setup();
		run(16);
		engine.destroy();
		expect(ioInstances[0]!.disconnect).toHaveBeenCalled();
		expect(roInstances[0]!.disconnect).toHaveBeenCalled();
		const calls = painter.mock.calls.length;
		host.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: 20, clientY: 10 }));
		run(32);
		expect(painter.mock.calls.length).toBe(calls);
	});
});

describe("wave", () => {
	it("covers the farthest corner plus the halo, and glows toward the inner rim", () => {
		expect(waveCover(0, 0, 30, 40)).toBeCloseTo(50 + WAVE_HALO_CELLS + 1, 5);
		expect(waveGlow(0)).toBe(1.5);
		expect(waveGlow(1)).toBeCloseTo(4.9, 5);
		expect(easeInOutCubic(0.5)).toBe(0.5);
	});

	it("composes: new picture inside, dithered halo on the band, old picture outside", () => {
		const cur = createGrid(60, 1);
		const next = createGrid(60, 1);
		cur.color.fill(0x111111);
		next.color.fill(0x222222);
		next.emitters.push(1, 0, 0x222222, 2, 1);
		cur.emitters.push(50, 0, 0x111111, 2, 1);
		const side = new Uint8Array(60);
		composeWave(cur, next, side, 0.5, 0.5, 20);
		expect(cur.color[2]).toBe(0x222222);
		expect(side[2]).toBe(1);
		expect(cur.color[40]).toBe(0x111111);
		expect(side[40]).toBe(0);
		const band = [...cur.color.slice(11, 20)];
		expect(band.some((c) => WAVE_PALETTE.includes(c))).toBe(true);
		const lit = [...cur.glow.slice(11, 20)].filter((g) => g > 0);
		expect(Math.max(...lit)).toBeLessThanOrEqual(4.9 + 1e-6);
		expect(cur.emitters).toEqual([50, 0, 0x111111, 2, 1, 1, 0, 0x222222, 2, 1]);
	});

	it("keeps the halo SDR inside the copy corner", () => {
		const cur = createGrid(30, 1);
		const next = createGrid(30, 1);
		next.copyW = 30;
		next.copyH = 1;
		composeWave(cur, next, new Uint8Array(30), 0.5, 0.5, 20);
		const lit = [...cur.glow].filter((g) => g > 0);
		expect(lit.length).toBeGreaterThan(0);
		expect(lit.every((g) => g === 1)).toBe(true);
	});
});

describe("clearGrid", () => {
	it("resets every buffer", () => {
		const g = createGrid(2, 2);
		writeCell(g, 1, 1, "#fff", 1, 3, 2);
		clearGrid(g);
		expect([...g.color]).toEqual([-1, -1, -1, -1]);
		expect(g.emitters).toHaveLength(0);
		expect([...g.glow].every((v) => v === 0)).toBe(true);
	});
});
