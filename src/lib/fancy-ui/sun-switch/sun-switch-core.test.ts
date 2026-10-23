import { afterEach, describe, expect, it, vi } from "vitest";
import {
	BAYER4,
	DAY_REST_INK,
	EMPTY_POLYGON,
	HORIZON_ALPHA,
	SUN_PALETTE,
	bayer4,
	coverRadiusCells,
	createLens,
	createSunPainter,
	easeInOutCubic,
	gridOffset,
	haloColorIndex,
	haloDensity,
	hash2,
	inStaircase,
	paintHalo,
	paintSheet,
	paintSun,
	parseInk,
	rasterSun,
	staircaseHoleClip,
	staircasePolygon,
	staircaseRows,
	type Ctx2D,
	type SunPainterOptions,
} from "./sun-switch-core.js";

interface Op {
	op: "fill" | "clear";
	x: number;
	y: number;
	w: number;
	h: number;
	style: string;
	alpha: number;
}

function recorder(): Ctx2D & { ops: Op[] } {
	const ops: Op[] = [];
	const ctx = {
		ops,
		fillStyle: "#000" as Ctx2D["fillStyle"],
		globalAlpha: 1,
		fillRect(x: number, y: number, w: number, h: number) {
			ops.push({ op: "fill", x, y, w, h, style: String(ctx.fillStyle), alpha: ctx.globalAlpha });
		},
		clearRect(x: number, y: number, w: number, h: number) {
			ops.push({ op: "clear", x, y, w, h, style: "", alpha: ctx.globalAlpha });
		},
		setTransform() {},
	};
	return ctx;
}

describe("bayer4", () => {
	it("matches the 4 × 4 threshold table", () => {
		const table = [
			[0.03125, 0.53125, 0.15625, 0.65625],
			[0.78125, 0.28125, 0.90625, 0.40625],
			[0.21875, 0.71875, 0.09375, 0.59375],
			[0.96875, 0.46875, 0.84375, 0.34375],
		];
		for (let y = 0; y < 4; y++) {
			for (let x = 0; x < 4; x++) expect(bayer4(x, y)).toBe(table[y]![x]);
		}
	});

	it("repeats every 4 cells and wraps negatives", () => {
		expect(bayer4(4, 0)).toBe(0.03125);
		expect(bayer4(5, 6)).toBe(0.71875);
		expect(bayer4(-1, -1)).toBe(0.34375);
	});

	it("holds 16 distinct values summing to 8", () => {
		expect(new Set(BAYER4).size).toBe(16);
		expect(BAYER4.reduce((a, b) => a + b, 0)).toBeCloseTo(8, 10);
	});
});

describe("easing and halo depth", () => {
	it("easeInOutCubic", () => {
		expect(easeInOutCubic(0)).toBe(0);
		expect(easeInOutCubic(0.1)).toBeCloseTo(0.004, 10);
		expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625, 10);
		expect(easeInOutCubic(0.5)).toBe(0.5);
		expect(easeInOutCubic(0.75)).toBeCloseTo(0.9375, 10);
		expect(easeInOutCubic(0.9)).toBeCloseTo(0.996, 10);
		expect(easeInOutCubic(1)).toBe(1);
		expect(easeInOutCubic(-1)).toBe(0);
		expect(easeInOutCubic(2)).toBe(1);
	});

	it("haloDensity and Bayer coverage", () => {
		const lit = (D: number) => BAYER4.filter((v) => v <= haloDensity(D)).length;
		expect(haloDensity(0)).toBe(0);
		expect(haloDensity(1)).toBe(1);
		expect(haloDensity(0.5)).toBeCloseTo(0.6156, 4);
		expect([0, 0.007, 0.1, 0.25, 0.5, 0.75, 1].map(lit)).toEqual([0, 0, 3, 6, 10, 13, 16]);
	});

	it("haloColorIndex: outer fringe 0, inner rim 3", () => {
		expect([0, 0.24, 0.25, 0.5, 0.74, 0.75, 0.999, 1, 2, -1].map(haloColorIndex)).toEqual([
			0, 0, 1, 2, 2, 3, 3, 3, 3, 0,
		]);
	});
});

describe("parseInk", () => {
	it("parses rgb, rgba, hex and transparent", () => {
		expect(parseInk("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
		expect(parseInk("rgba(10, 20, 30, 0.5)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
		expect(parseInk("rgb(10 20 30 / 0.25)")).toEqual({ r: 10, g: 20, b: 30, a: 0.25 });
		expect(parseInk("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
		expect(parseInk("#00000080")?.a).toBeCloseTo(128 / 255, 6);
		expect(parseInk("transparent")).toEqual({ r: 0, g: 0, b: 0, a: 0 });
	});

	it("returns null for formats it does not know", () => {
		expect(parseInk("oklch(0.5 0.1 200)")).toBeNull();
		expect(parseInk("red")).toBeNull();
		expect(parseInk("#12")).toBeNull();
	});
});

describe("grid and cover", () => {
	it("coverRadiusCells", () => {
		expect(coverRadiusCells({ x: 100, y: 60 }, 1280, 800, 5, 9)).toBeCloseTo(287.5678, 4);
		expect(coverRadiusCells({ x: 640, y: 400 }, 1280, 800, 5, 9)).toBeCloseTo(159.9437, 4);
		expect(coverRadiusCells({ x: 0, y: 0 }, 300, 400, 5, 9)).toBe(109);
	});

	it("gridOffset", () => {
		expect(gridOffset(12.5, 5)).toBe(2.5);
		expect(gridOffset(-3, 5)).toBe(2);
		expect(gridOffset(10, 5)).toBe(0);
	});
});

describe("staircase", () => {
	it("staircaseRows for a small disc", () => {
		expect(staircaseRows(10.5, 10.5, 2.5, 5, 2, 3)).toEqual([
			{ y0: 43, y1: 48, x0: 47, x1: 62 },
			{ y0: 48, y1: 53, x0: 42, x1: 67 },
			{ y0: 53, y1: 58, x0: 42, x1: 67 },
			{ y0: 58, y1: 63, x0: 42, x1: 67 },
			{ y0: 63, y1: 68, x0: 47, x1: 62 },
		]);
	});

	it("staircasePolygon removes consecutive duplicate vertices", () => {
		expect(staircasePolygon(staircaseRows(10.5, 10.5, 2.5, 5, 2, 3))).toBe(
			"polygon(62px 43px, 62px 48px, 67px 48px, 67px 53px, 67px 58px, 67px 63px, 62px 63px, 62px 68px, 47px 68px, 47px 63px, 42px 63px, 42px 58px, 42px 53px, 42px 48px, 47px 48px, 47px 43px)"
		);
	});

	it("staircaseHoleClip cuts the staircase out of the box (even-odd)", () => {
		expect(staircaseHoleClip([], 100, 50)).toBe('path(evenodd, "M0 0H100V50H0Z")');
		expect(staircaseHoleClip(staircaseRows(10.5, 10.5, 0.5, 5, 0, 0), 100, 50)).toBe(
			'path(evenodd, "M0 0H100V50H0ZM55 50L55 55L50 55L50 50Z")'
		);
	});

	it("is empty for a non-positive or NaN radius", () => {
		expect(staircaseRows(10.5, 10.5, 0, 5, 0, 0)).toEqual([]);
		expect(staircaseRows(10.5, 10.5, -2, 5, 0, 0)).toEqual([]);
		expect(staircaseRows(10.5, 10.5, NaN, 5, 0, 0)).toEqual([]);
		expect(staircasePolygon([])).toBe(EMPTY_POLYGON);
		expect(EMPTY_POLYGON).toBe("polygon(0 0, 0 0, 0 0)");
	});

	it("covers exactly one cell at radius 0.5", () => {
		expect(staircaseRows(0.5, 0.5, 0.5, 5, 0, 0)).toEqual([{ y0: 0, y1: 5, x0: 0, x1: 5 }]);
	});

	it("keeps every coordinate on the grid", () => {
		const rows = staircaseRows(57.3, 33.1, 40.2, 5, 1.25, 3.5);
		expect(rows).toHaveLength(80);
		for (const r of rows) {
			expect(Number.isInteger((r.x0 - 1.25) / 5)).toBe(true);
			expect(Number.isInteger((r.x1 - 1.25) / 5)).toBe(true);
			expect(Number.isInteger((r.y0 - 3.5) / 5)).toBe(true);
			expect(r.y1 - r.y0).toBe(5);
		}
	});

	it("inStaircase agrees with staircaseRows cell by cell", () => {
		const tx = 10.5;
		const ty = 10.5;
		for (const inner of [0.5, 2.5, 3.7, 6.2, 9.9]) {
			const rows = staircaseRows(tx, ty, inner, 1, 0, 0);
			for (let j = 0; j < 21; j++) {
				for (let i = 0; i < 21; i++) {
					const expected = rows.some((r) => r.y0 === j && i >= r.x0 && i < r.x1);
					expect(inStaircase(i, j, tx, ty, inner)).toBe(expected);
				}
			}
		}
	});
});

describe("paintHalo", () => {
	const counts: Record<number, [number, number, number, number, number]> = {
		3: [4, 3, 1, 0, 0],
		9: [108, 23, 35, 34, 16],
		20: [480, 55, 122, 142, 161],
		60: [980, 96, 195, 296, 393],
	};

	for (const [R, [total, ...perColour]] of Object.entries(counts)) {
		it(`draws the reference band at R = ${R}`, () => {
			const ctx = recorder();
			const n = paintHalo(ctx, {
				cx: 40.5,
				cy: 40.5,
				R: Number(R),
				halo: 9,
				cell: 5,
				dot: 4,
				ox: 2,
				oy: 3,
				W: 995,
				H: 995,
				palette: SUN_PALETTE,
			});
			expect(n).toBe(total);
			expect(ctx.ops).toHaveLength(total);
			const by = SUN_PALETTE.map((c) => ctx.ops.filter((o) => o.style === c).length);
			expect(by).toEqual(perColour);
			for (const o of ctx.ops) {
				expect(o.w).toBe(4);
				expect(o.h).toBe(4);
				expect((o.x - 2) % 5).toBe(0);
				expect((o.y - 3) % 5).toBe(0);
				expect(o.alpha).toBe(1);
			}
		});
	}

	it("rounds to device pixels at a fractional DPR", () => {
		const ctx = recorder();
		paintHalo(ctx, {
			cx: 10.5,
			cy: 10.5,
			R: 9,
			halo: 9,
			cell: 5,
			dot: 4,
			ox: 0,
			oy: 0,
			W: 200,
			H: 200,
			palette: SUN_PALETTE,
			dpr: 1.5,
		});
		expect(ctx.ops.length).toBeGreaterThan(0);
		for (const o of ctx.ops) {
			expect(o.w).toBe(6);
			expect(Number.isInteger(o.x) && Number.isInteger(o.y)).toBe(true);
		}
	});

	it("draws nothing at R = 0", () => {
		const ctx = recorder();
		const base = { cx: 1.5, cy: 1.5, halo: 9, cell: 5, dot: 4, ox: 0, oy: 0, W: 100, H: 100 };
		expect(paintHalo(ctx, { ...base, R: 0, palette: SUN_PALETTE })).toBe(0);
		expect(ctx.ops).toHaveLength(0);
	});
});

describe("paintSheet", () => {
	it("fills everything when there is no hole", () => {
		const ctx = recorder();
		paintSheet(ctx, "#123456", 100, 50, 2, null);
		expect(ctx.ops).toEqual([
			{ op: "fill", x: 0, y: 0, w: 200, h: 100, style: "#123456", alpha: 1 },
		]);
	});

	it("leaves the staircase hole and clears the keep rect", () => {
		const ctx = recorder();
		const hole = staircaseRows(10.5, 10.5, 2.5, 5, 0, 0);
		paintSheet(ctx, "#fff", 100, 100, 1, hole, { x: 0, y: 0, w: 10, h: 10 });
		const fills = ctx.ops.filter((o) => o.op === "fill");
		const inside = (px: number, py: number) =>
			fills.some((f) => px >= f.x && px < f.x + f.w && py >= f.y && py < f.y + f.h);
		// centre of the hole is open, a far corner is covered, rows tile without overlap
		expect(inside(52, 52)).toBe(false);
		expect(inside(42, 42)).toBe(true);
		expect(inside(95, 95)).toBe(true);
		const area = fills.reduce((a, f) => a + f.w * f.h, 0);
		const holeArea = hole.reduce((a, r) => a + (r.x1 - r.x0) * (r.y1 - r.y0), 0);
		expect(area).toBe(100 * 100 - holeArea);
		expect(ctx.ops.at(-1)).toMatchObject({ op: "clear", x: 0, y: 0, w: 10, h: 10 });
	});
});

describe("rasterSun", () => {
	it("radius 10 with horizon", () => {
		const r = rasterSun({ radius: 10, horizon: true });
		expect(r.size).toBe(21);
		expect(r.horizonRow).toBe(13);
		const sun = r.cells.filter((c) => c.layer === "sun");
		const hz = r.cells.filter((c) => c.layer === "horizon");
		expect(sun).toHaveLength(227);
		expect(hz).toHaveLength(41);
		// the dotted line plus three dashed reflection rows, then nothing
		const hzRows = Array.from({ length: 8 }, (_, k) => hz.filter((c) => c.y === 13 + k).length);
		expect(hzRows).toEqual([11, 14, 9, 7, 0, 0, 0, 0]);
		for (const c of hz) if (c.y > 13) expect((c.x + c.y) % 4).not.toBe(3);
		const perRow = Array.from({ length: 13 }, (_, y) => sun.filter((c) => c.y === y).length);
		expect(perRow).toEqual([7, 11, 13, 15, 17, 19, 19, 21, 21, 21, 21, 21, 21]);
		const colourOfRow = (y: number) => sun.find((c) => c.y === y)!.color;
		expect([0, 3, 4, 6, 7, 9, 10, 12].map(colourOfRow)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
		for (const c of hz) expect(c.color).toBeGreaterThanOrEqual(1);
	});

	it("radius 10 without horizon is a full centred disc", () => {
		const r = rasterSun({ radius: 10, horizon: false });
		expect(r.cells).toHaveLength(349);
		expect(r.cells.every((c) => c.layer === "sun")).toBe(true);
		for (let y = 0; y < 21; y++) {
			const xs = r.cells.filter((c) => c.y === y).map((c) => c.x);
			expect(Math.min(...xs) + Math.max(...xs)).toBe(20);
			expect(r.cells.find((c) => c.y === y)!.color).toBe(Math.floor((y * 4) / 21));
		}
	});

	it("pins hash2 so the horizon stays stable", () => {
		expect(hash2(0, 0)).toBe(0);
		expect(hash2(3, 14)).toBeCloseTo(0.389487, 6);
		expect(hash2(14, 3)).toBeCloseTo(0.731127, 6);
	});
});

describe("createLens", () => {
	const F = 1000 / 60;

	it("grows from 0 to the radius in 12 frames", () => {
		const lens = createLens({ radius: 20 });
		const expected = [
			6.0065, 10.2092, 13.1496, 15.207, 16.6465, 17.6536, 18.3583, 18.8513, 19.1963, 19.4377,
			19.6066,
		];
		const target = { x: 5, y: 5, on: true };
		for (let i = 0; i < expected.length; i++) {
			expect(lens.step(i * F, target, false)).toBe(true);
			expect(lens.r).toBeCloseTo(expected[i]!, 3);
		}
		expect(lens.step(11 * F, target, false)).toBe(false);
		expect(lens.r).toBe(20);
	});

	it("shrinks from the radius to 0 in 22 frames", () => {
		const lens = createLens({ radius: 20 });
		lens.step(0, { x: 0, y: 0, on: true }, true);
		lens.resetClock();
		const off = { x: 0, y: 0, on: false };
		const rs: number[] = [];
		let moving = true;
		let i = 0;
		while (moving && i < 40) moving = lens.step(i++ * F, off, false) && rs.push(lens.r) > 0;
		expect(rs[0]).toBeCloseTo(16.5011, 3);
		expect(rs[1]).toBeCloseTo(13.6142, 3);
		expect(lens.r).toBe(0);
		expect(i).toBe(22);
	});

	it("snaps to the pointer on first entry, then lerps frame-rate independently", () => {
		const lens = createLens({ radius: 20 });
		lens.step(0, { x: 0, y: 0, on: true }, false);
		expect(lens.x).toBe(0);
		lens.step(F, { x: 10, y: 0, on: true }, false);
		expect(lens.x).toBeCloseTo(3.5, 6);

		const two = createLens({ radius: 20 });
		two.step(0, { x: 0, y: 0, on: true }, false);
		two.step(2 * F, { x: 10, y: 0, on: true }, false);
		expect(two.x).toBeCloseTo(5.775, 6);
	});

	it("snaps everything under reduced motion", () => {
		const lens = createLens({ radius: 7 });
		expect(lens.step(0, { x: 3, y: 4, on: true }, true)).toBe(false);
		expect([lens.x, lens.y, lens.r]).toEqual([3, 4, 7]);
		expect(lens.covers(3, 4)).toBe(true);
		expect(lens.covers(20, 20)).toBe(false);
		lens.step(10, { x: 3, y: 4, on: false }, true);
		expect(lens.r).toBe(0);
		expect(lens.covers(3, 4)).toBe(false);
	});
});

describe("paintSun", () => {
	const raster = rasterSun({ radius: 10, horizon: true });
	const base = {
		cell: 5,
		dot: 4,
		dpr: 1,
		palette: SUN_PALETTE,
		nightAlpha: 0.34,
		ink: "rgb(0, 0, 0)",
		lens: null,
		front: null,
	};

	it("day: coloured sun, ink horizon", () => {
		const ctx = recorder();
		paintSun(ctx, raster, { ...base, checked: true });
		// 227 sun dots + 41 horizon dots + 227 ink tints over the sun
		expect(ctx.ops).toHaveLength(495);
		const sun = ctx.ops.filter((o) => o.alpha === 1);
		expect(sun).toHaveLength(227);
		expect(new Set(sun.map((o) => o.style))).toEqual(new Set(SUN_PALETTE));
		const tint = ctx.ops.filter((o) => o.alpha === DAY_REST_INK);
		expect(tint).toHaveLength(227);
		expect(tint.every((o) => o.style === "rgb(0, 0, 0)")).toBe(true);
		const hz = ctx.ops.filter((o) => o.alpha === HORIZON_ALPHA);
		expect(hz).toHaveLength(41);
		expect(hz.every((o) => o.style === "rgb(0, 0, 0)")).toBe(true);
	});

	it("night: everything in ink", () => {
		const ctx = recorder();
		paintSun(ctx, raster, { ...base, checked: false });
		expect(ctx.ops.every((o) => o.style === "rgb(0, 0, 0)")).toBe(true);
		expect(ctx.ops.filter((o) => o.alpha === 0.34)).toHaveLength(227);
	});

	it("the lens shows the pure day colour (no ink tint) under it", () => {
		const lens = createLens({ radius: 3 });
		lens.step(0, { x: 10.5, y: 3.5, on: true }, true);
		const ctx = recorder();
		paintSun(ctx, raster, { ...base, checked: true, lens });
		const tinted = new Set(
			ctx.ops.filter((o) => o.alpha === DAY_REST_INK).map((o) => `${o.x},${o.y}`)
		);
		expect(tinted.has("50,15")).toBe(false); // cell (10, 3), under the lens
		expect(tinted.has("50,50")).toBe(true); // cell (10, 10), outside it
	});

	it("the lens reveals true colours at night", () => {
		const lens = createLens({ radius: 3 });
		lens.step(0, { x: 10.5, y: 12.5, on: true }, true);
		const ctx = recorder();
		paintSun(ctx, raster, { ...base, checked: false, lens });
		const coloured = ctx.ops.filter((o) => o.alpha === 1);
		expect(coloured.length).toBeGreaterThan(10);
		expect(coloured.every((o) => (SUN_PALETTE as readonly string[]).includes(o.style))).toBe(true);
	});

	it("splits on the front: new state inside the staircase, old state and ink outside", () => {
		const ctx = recorder();
		// going to night from day: inside = night (new ink), outside = day (coloured)
		paintSun(ctx, raster, {
			...base,
			checked: false,
			ink: "rgb(255, 255, 255)",
			front: { cx: 52.5, cy: 52.5, R: 3 * 5, nextChecked: false, oldInk: "rgb(0, 0, 0)" },
		});
		const centre = ctx.ops.find((o) => o.x === 50 && o.y === 50)!;
		expect(centre).toMatchObject({ style: "rgb(255, 255, 255)", alpha: 0.34 });
		const top = ctx.ops.find((o) => o.x === 50 && o.y === 0)!;
		expect(top.alpha).toBe(1);
		const hzFar = ctx.ops.find((o) => o.y === 13 * 5 && o.x === 0)!;
		expect(hzFar).toMatchObject({ style: "rgb(0, 0, 0)", alpha: HORIZON_ALPHA });
	});
});

describe("createSunPainter", () => {
	afterEach(() => vi.restoreAllMocks());

	const opts: SunPainterOptions = {
		radius: 10,
		cell: 5,
		dot: 4,
		palette: SUN_PALETTE,
		nightAlpha: 0.34,
		horizon: true,
		lens: true,
		lensRadius: 7,
		checked: true,
		reducedMotion: false,
	};

	it("returns null without a 2D context (jsdom)", () => {
		expect(createSunPainter(document.createElement("canvas"), opts)).toBeNull();
	});

	it("sizes the backing store, paints, and repaints on option changes", () => {
		const ctx = recorder();
		const canvas = document.createElement("canvas");
		vi.spyOn(canvas, "getContext").mockReturnValue(ctx as never);
		vi.stubGlobal("devicePixelRatio", 2);
		const p = createSunPainter(canvas, opts)!;
		expect(p).not.toBeNull();
		expect(canvas.width).toBe(210);
		expect(canvas.height).toBe(210);
		expect(ctx.ops.filter((o) => o.op === "fill")).toHaveLength(495);
		expect(ctx.ops.find((o) => o.op === "fill")!.w).toBe(8);

		ctx.ops.length = 0;
		p.setOptions({ radius: 5 });
		expect(canvas.width).toBe(110);
		expect(ctx.ops.some((o) => o.op === "fill")).toBe(true);
		p.destroy();
		vi.unstubAllGlobals();
	});

	it("runs the loop only while the lens moves, and sleeps / wakes", () => {
		const ctx = recorder();
		const canvas = document.createElement("canvas");
		vi.spyOn(canvas, "getContext").mockReturnValue(ctx as never);
		const queue: ((t: number) => void)[] = [];
		vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => queue.push(cb));
		vi.stubGlobal("cancelAnimationFrame", () => {
			queue.length = 0;
		});
		const p = createSunPainter(canvas, opts)!;
		p.pointer(10, 10, true);
		expect(queue).toHaveLength(1);
		let t = 0;
		let frames = 0;
		while (queue.length && frames < 100) {
			queue.shift()!((t += 1000 / 60));
			frames++;
		}
		expect(frames).toBeGreaterThan(5);
		expect(frames).toBeLessThan(40);
		expect(queue).toHaveLength(0);

		p.sleep();
		p.pointer(2, 2, false);
		expect(queue).toHaveLength(0);
		p.wake();
		expect(queue).toHaveLength(1);
		p.destroy();
		expect(queue).toHaveLength(0);
		vi.unstubAllGlobals();
	});

	it("keeps looping while a front is set", () => {
		const ctx = recorder();
		const canvas = document.createElement("canvas");
		vi.spyOn(canvas, "getContext").mockReturnValue(ctx as never);
		const queue: ((t: number) => void)[] = [];
		vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => queue.push(cb));
		vi.stubGlobal("cancelAnimationFrame", () => {});
		const p = createSunPainter(canvas, { ...opts, lens: false })!;
		p.setFront({ cx: 52.5, cy: 52.5, R: 10, nextChecked: false, oldInk: "#000" });
		for (let i = 0; i < 5; i++) queue.shift()!(i * 16);
		expect(queue).toHaveLength(1);
		p.setFront(null);
		queue.shift()!(100);
		expect(queue).toHaveLength(0);
		p.destroy();
		vi.unstubAllGlobals();
	});
});
