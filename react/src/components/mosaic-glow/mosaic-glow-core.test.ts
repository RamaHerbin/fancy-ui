import { describe, expect, it } from "vitest";
import {
	ATTACK_TAU,
	buildLut,
	createGrid,
	driftPoint,
	falloff,
	flickerTiles,
	lutIndex,
	mix,
	mulberry32,
	parseRgb,
	rate,
	releaseTau,
	smoothingTau,
	tileRandom,
	updateTiles,
} from "./mosaic-glow-core.js";

const STEP = { pitch: 20, tile: 18, attackTau: ATTACK_TAU, releaseTau: releaseTau(0.6) };

describe("mosaic-glow-core / randomness", () => {
	it("mulberry32 is deterministic and in [0, 1)", () => {
		const a = mulberry32(7);
		const b = mulberry32(7);
		const seqA = Array.from({ length: 8 }, () => a());
		const seqB = Array.from({ length: 8 }, () => b());
		expect(seqA).toEqual(seqB);
		for (const v of seqA) {
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
		expect(new Set(seqA).size).toBeGreaterThan(1);
	});

	it("tileRandom is stable per (seed, col, row, salt) and varies with each", () => {
		const v = tileRandom(1, 3, 4, 1);
		expect(tileRandom(1, 3, 4, 1)).toBe(v);
		expect(v).toBeGreaterThanOrEqual(0);
		expect(v).toBeLessThan(1);
		expect(tileRandom(2, 3, 4, 1)).not.toBe(v);
		expect(tileRandom(1, 4, 3, 1)).not.toBe(v);
		expect(tileRandom(1, 3, 4, 2)).not.toBe(v);
	});
});

describe("mosaic-glow-core / grid", () => {
	it("createGrid sizes arrays, bounds values and starts cold", () => {
		const g = createGrid(3, 2, 1, 0.7, 0.35);
		expect(g.cols).toBe(3);
		expect(g.rows).toBe(2);
		expect(g.weight.length).toBe(6);
		expect(g.heat.length).toBe(6);
		for (let i = 0; i < 6; i++) {
			expect(g.weight[i]).toBeGreaterThanOrEqual(0.3 - 1e-6);
			expect(g.weight[i]).toBeLessThanOrEqual(1);
			expect(g.ambient[i]).toBeGreaterThanOrEqual(0);
			expect(g.ambient[i]).toBeLessThanOrEqual(0.35 * 0.4);
			expect(g.ambientTarget[i]).toBe(g.ambient[i]);
			expect(g.heat[i]).toBe(0);
		}
	});

	it("is deterministic for a seed and stable across grid sizes (resize does not reshuffle)", () => {
		const a = createGrid(3, 2, 9, 0.7, 0.35);
		const b = createGrid(3, 2, 9, 0.7, 0.35);
		expect(Array.from(a.weight)).toEqual(Array.from(b.weight));
		const big = createGrid(5, 4, 9, 0.7, 0.35);
		// tile (col 2, row 1) keeps its value whatever the grid width
		expect(big.weight[1 * 5 + 2]).toBe(a.weight[1 * 3 + 2]);
		expect(big.ambient[1 * 5 + 2]).toBe(a.ambient[1 * 3 + 2]);
		const other = createGrid(3, 2, 10, 0.7, 0.35);
		expect(Array.from(other.weight)).not.toEqual(Array.from(a.weight));
	});
});

describe("mosaic-glow-core / curves", () => {
	it("falloff hits 1 at the centre, 0.5 halfway, 0 at and beyond the rim, monotonic", () => {
		expect(falloff(0)).toBe(1);
		expect(falloff(-1)).toBe(1);
		expect(falloff(0.5)).toBeCloseTo(0.5);
		expect(falloff(1)).toBe(0);
		expect(falloff(2)).toBe(0);
		let prev = 1;
		for (let d = 0; d <= 1; d += 0.05) {
			const v = falloff(d);
			expect(v).toBeLessThanOrEqual(prev + 1e-9);
			prev = v;
		}
	});

	it("rate is an exponential approach", () => {
		expect(rate(0.1, 0)).toBe(1);
		expect(rate(0, 0.5)).toBe(0);
		expect(rate(1 / 60, ATTACK_TAU)).toBeCloseTo(0.34, 1);
		expect(rate(0.05, 0.2)).toBeLessThan(rate(0.1, 0.2));
	});

	it("maps trail and smoothing to time constants", () => {
		expect(releaseTau(0)).toBeLessThan(releaseTau(1));
		expect(releaseTau(0.6)).toBeCloseTo(0.47);
		expect(releaseTau(5)).toBe(releaseTau(1));
		expect(smoothingTau(0)).toBe(0);
		expect(smoothingTau(0.15)).toBeCloseTo(0.12);
		expect(smoothingTau(Number.NaN)).toBe(0);
	});
});

describe("mosaic-glow-core / heat", () => {
	it("lights the tile under the halo quickly and far tiles not at all", () => {
		const g = createGrid(10, 10, 1, 0, 0);
		const halo = { x: 5 * 20 + 9, y: 5 * 20 + 9, r: 60 };
		for (let i = 0; i < 6; i++) updateTiles(g, halo, 1 / 60, STEP);
		const centre = g.heat[5 * 10 + 5]!;
		expect(centre).toBeGreaterThan(0.9 * g.weight[5 * 10 + 5]!);
		expect(g.heat[0]).toBe(0);
		expect(g.heat[99]).toBe(0);
	});

	it("releases slower than it attacks and settles to zero", () => {
		const g = createGrid(4, 4, 1, 0, 0);
		const halo = { x: 29, y: 29, r: 50 };
		for (let i = 0; i < 30; i++) updateTiles(g, halo, 1 / 60, STEP);
		const lit = g.heat[1 * 4 + 1]!;
		expect(lit).toBeGreaterThan(0.95);
		// 0.5s without halo: still visibly lit but clearly decaying
		for (let i = 0; i < 30; i++) updateTiles(g, null, 1 / 60, STEP);
		const after = g.heat[1 * 4 + 1]!;
		expect(after).toBeLessThan(0.5);
		expect(after).toBeGreaterThan(0.05);
		// eventually fully dark and reports 0 remaining delta
		let remaining = 1;
		for (let i = 0; i < 600 && remaining > 0; i++) remaining = updateTiles(g, null, 1 / 60, STEP);
		expect(remaining).toBe(0);
		expect(g.heat[1 * 4 + 1]).toBe(0);
	});

	it("returns 0 on a cold grid with no halo (loop can stop)", () => {
		const g = createGrid(4, 4, 1, 0.7, 0.35);
		expect(updateTiles(g, null, 1 / 60, STEP)).toBe(0);
		expect(updateTiles(g, { x: 10, y: 10, r: 0 }, 1 / 60, STEP)).toBe(0);
	});

	it("respects per-tile weight", () => {
		const g = createGrid(1, 1, 1, 0, 0);
		g.weight[0] = 0.4;
		for (let i = 0; i < 60; i++) updateTiles(g, { x: 9, y: 9, r: 50 }, 1 / 60, STEP);
		expect(g.heat[0]).toBeCloseTo(0.4, 2);
	});
});

describe("mosaic-glow-core / flicker", () => {
	it("retargets every tile when rng is 0 and none when rng is 1, easing toward target", () => {
		const g = createGrid(3, 3, 1, 0.7, 0.35);
		const before = Array.from(g.ambientTarget);
		flickerTiles(g, 1 / 60, 0.15, 0.35, () => 1);
		expect(Array.from(g.ambientTarget)).toEqual(before);

		flickerTiles(g, 1 / 60, 0.15, 0.35, () => 0);
		for (let i = 0; i < 9; i++) expect(g.ambientTarget[i]).toBe(0);

		let lastRng = 0;
		const rng = () => (lastRng = lastRng === 0 ? 0 : 0.999);
		const g2 = createGrid(1, 1, 1, 0.7, 0.35);
		// first call picks (retarget), second returns level 0.999³·0.35 ≈ 0.349
		flickerTiles(g2, 1 / 60, 0.15, 0.35, rng);
		for (let i = 0; i < 200; i++) flickerTiles(g2, 1 / 60, 0, 0.35, () => 1);
		expect(g2.ambient[0]).toBeCloseTo(g2.ambientTarget[0]!, 3);
		expect(g2.ambient[0]).toBeLessThanOrEqual(0.35 * 0.4);
	});
});

describe("mosaic-glow-core / colour", () => {
	it("parses hex and rgb(), rejects garbage", () => {
		expect(parseRgb("#abc")).toEqual([170, 187, 204]);
		expect(parseRgb("#aabbcc")).toEqual([170, 187, 204]);
		expect(parseRgb(" #F2C318 ")).toEqual([242, 195, 24]);
		expect(parseRgb("rgb(1, 2, 3)")).toEqual([1, 2, 3]);
		expect(parseRgb("rgba(1 2 3 / 0.5)")).toEqual([1, 2, 3]);
		expect(parseRgb("gold")).toBeNull();
		expect(parseRgb("")).toBeNull();
	});

	it("mix interpolates and clamps t", () => {
		expect(mix([0, 0, 0], [255, 255, 255], 0.5)).toEqual([128, 128, 128]);
		expect(mix([0, 0, 0], [255, 255, 255], 2)).toEqual([255, 255, 255]);
		expect(mix([10, 20, 30], [10, 20, 30], 0.3)).toEqual([10, 20, 30]);
	});

	it("buildLut ramps from a warm base through the colour to a near-white peak", () => {
		const lut = buildLut("#0a0a0a", "#f2c318");
		expect(lut).toHaveLength(64);
		expect(lut[0]).toBe("rgb(22, 19, 11)");
		const knee = Math.round(0.55 * 63);
		const col = parseRgb(lut[knee]!)!;
		for (let c = 0; c < 3; c++)
			expect(Math.abs(col[c]! - [242, 195, 24][c]!)).toBeLessThanOrEqual(3);
		const peak = parseRgb(lut[63]!)!;
		for (let c = 0; c < 3; c++) {
			expect(peak[c]).toBeGreaterThan(col[c]!);
			expect(peak[c]).toBeLessThanOrEqual(255);
		}
	});

	it("buildLut falls back on invalid colours and lutIndex clamps", () => {
		const lut = buildLut("nope", "still nope");
		expect(lut[0]).toBe("rgb(22, 19, 11)");
		expect(lutIndex(0, 0, 1, 64)).toBe(0);
		expect(lutIndex(0.35, 1, 1, 64)).toBe(63);
		expect(lutIndex(0.5, 0.5, 0, 64)).toBe(Math.floor(0.5 * 63));
		expect(lutIndex(-1, 0, 1, 64)).toBe(0);
	});
});

describe("mosaic-glow-core / drift", () => {
	it("stays inside the box for a long time", () => {
		for (let t = 0; t <= 200; t += 0.1) {
			const p = driftPoint(t, 800, 600);
			expect(p.x).toBeGreaterThanOrEqual(0);
			expect(p.x).toBeLessThanOrEqual(800);
			expect(p.y).toBeGreaterThanOrEqual(0);
			expect(p.y).toBeLessThanOrEqual(600);
		}
	});

	it("moves over time", () => {
		const a = driftPoint(0, 800, 600);
		const b = driftPoint(1, 800, 600);
		expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(1);
	});
});
