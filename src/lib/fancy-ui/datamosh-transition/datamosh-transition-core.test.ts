import { describe, expect, it } from "vitest";
import {
	DEFAULT_COLORS,
	DEFAULT_TILES,
	STRIP_LENGTH,
	buildStrip,
	columnBand,
	coverFit,
	sampleSource,
	sourceSlot,
	sourceSlotY,
	SOURCE_SPAN,
	MAX_GAIN,
	columnDelays,
	columnEdges,
	resolvePalette,
	DATAMOSH_PALETTES,
	columnFlow,
	columnTiles,
	createCoverage,
	easeEdge,
	luminance,
	oddTiles,
	paletteRoles,
	settleCoverage,
	springStep,
	stepCoverage,
	stripIndex,
	tileEdge,
} from "./datamosh-transition-core.js";

describe("columnEdges", () => {
	it("spans the width with columns that widen to the right", () => {
		const edges = columnEdges(1344, 11, 1.65);
		expect(edges).toHaveLength(12);
		expect(edges[0]).toBe(0);
		expect(edges[11]).toBe(1344);
		const widths = edges.slice(1).map((e, i) => e - edges[i]!);
		for (let i = 1; i < widths.length; i++) expect(widths[i]!).toBeGreaterThan(widths[i - 1]!);
	});

	it("is uniform at power 1", () => {
		const edges = columnEdges(110, 11, 1);
		expect(edges.slice(1).map((e, i) => e - edges[i]!)).toEqual(Array(11).fill(10));
	});
});

describe("oddTiles", () => {
	it("forces an odd count of at least 3", () => {
		expect(oddTiles(15)).toBe(15);
		expect(oddTiles(14)).toBe(15);
		expect(oddTiles(1)).toBe(3);
		expect(oddTiles(Number.NaN)).toBe(DEFAULT_TILES);
	});
});

describe("tileEdge", () => {
	const T = 15;
	it("maps [0, tiles] onto [0, 1] and is symmetric", () => {
		expect(tileEdge(0, T)).toBe(0);
		expect(tileEdge(T, T)).toBe(1);
		expect(tileEdge(T / 2, T)).toBeCloseTo(0.5, 10);
		expect(tileEdge(3, T) + tileEdge(T - 3, T)).toBeCloseTo(1, 10);
	});

	it("is monotonic and continuous past both ends (linear tails, no clamp)", () => {
		let prev = -Infinity;
		for (let k = -5; k <= T + 5; k += 0.01) {
			const y = tileEdge(k, T);
			expect(y).toBeGreaterThanOrEqual(prev);
			prev = y;
		}
		expect(tileEdge(-3, T)).toBeLessThan(tileEdge(-1, T));
		expect(tileEdge(-3, T)).toBeLessThan(0);
		expect(tileEdge(T + 3, T)).toBeGreaterThan(tileEdge(T + 1, T));
	});

	it("gives the centre tile the whole bulge with an odd count", () => {
		const heights = Array.from({ length: T }, (_, k) => tileEdge(k + 1, T) - tileEdge(k, T));
		const centre = heights[(T - 1) / 2]!;
		expect(centre).toBe(Math.max(...heights));
		expect(centre).toBeGreaterThan(0.4);
		// edge tiles are slivers
		expect(heights[0]!).toBeLessThan(0.01);
	});
});

describe("springStep", () => {
	it("is exact at 0, 1/2 and 1 and monotonic", () => {
		expect(springStep(0)).toBe(0);
		expect(springStep(0.5)).toBeCloseTo(0.5, 10);
		expect(springStep(1)).toBeCloseTo(1, 10);
		let prev = -1;
		for (let p = 0; p <= 1; p += 0.001) {
			const v = springStep(p);
			expect(v).toBeGreaterThanOrEqual(prev);
			prev = v;
		}
	});

	it("rushes at the ends of a step and hangs in the middle", () => {
		const d = 1e-4;
		const edgeSpeed = springStep(d) / d;
		const midSpeed = (springStep(0.5 + d) - springStep(0.5 - d)) / (2 * d);
		expect(edgeSpeed / midSpeed).toBeGreaterThan(4);
	});
});

describe("columnFlow", () => {
	it("is unbounded (never wrapped) and increases with time", () => {
		const a = columnFlow(1, 5, 11);
		const b = columnFlow(10, 5, 11);
		expect(b).toBeGreaterThan(a);
		expect(b).toBeGreaterThan(40);
	});

	it("offsets columns by a fraction of a tile, higher to the right", () => {
		const t = 3.1234;
		const f0 = columnFlow(t, 0, 11);
		const f1 = columnFlow(t, 1, 11);
		expect(f1).toBeLessThan(f0);
	});
});

describe("columnTiles", () => {
	it("covers the full height bottom-up with overlap", () => {
		const h = 600;
		const rects = columnTiles(7.3, 15, h, 7);
		for (let i = 1; i < rects.length; i++) {
			expect(rects[i]!.id).toBe(rects[i - 1]!.id - 1);
			// the tile above ends at or below the next one's top (bleed overlap)
			expect(rects[i]!.bot).toBeGreaterThanOrEqual(rects[i - 1]!.top);
		}
		expect(Math.min(...rects.map((r) => r.top))).toBeLessThanOrEqual(0);
		expect(Math.max(...rects.map((r) => r.bot))).toBeGreaterThanOrEqual(h);
	});

	it("keeps a tile's identity (and so its colour) as the stack falls", () => {
		const strip = buildStrip(4, DEFAULT_COLORS);
		const a = columnTiles(7.2, 15, 600, 0);
		const b = columnTiles(7.6, 15, 600, 0);
		const shared = a.filter((r) => b.some((s) => s.id === r.id));
		expect(shared.length).toBeGreaterThan(10);
		for (const r of shared) {
			const s = b.find((x) => x.id === r.id)!;
			expect(s.top).toBeGreaterThanOrEqual(r.top);
			expect(stripIndex(strip, s.id, 3)).toBe(stripIndex(strip, r.id, 3));
		}
	});
});

describe("palette + strip", () => {
	it("parses hex and rgb()", () => {
		expect(luminance("#ffffff")).toBeCloseTo(1, 5);
		expect(luminance("#000")).toBe(0);
		expect(luminance("rgb(255, 255, 255)")).toBeCloseTo(1, 5);
		expect(luminance("tomato")).toBeNull();
	});

	it("finds white and the two near-blacks in the default palette", () => {
		const roles = paletteRoles(DEFAULT_COLORS);
		expect(DEFAULT_COLORS[roles.light]).toBe("#ffffff");
		expect(roles.darks.map((i) => DEFAULT_COLORS[i]).sort()).toEqual(["#14101f", "#282142"]);
		expect(roles.hues).toHaveLength(8);
	});

	it("builds a deterministic cyclic strip with no repeated neighbours", () => {
		const strip = buildStrip(7, DEFAULT_COLORS);
		expect(strip).toEqual(buildStrip(7, DEFAULT_COLORS));
		expect(strip).toHaveLength(STRIP_LENGTH);
		for (let i = 0; i < strip.length; i++) {
			expect(strip[i]).not.toBe(strip[(i + 1) % strip.length]);
		}
	});

	it("keeps white and the darks recurring across seeds", () => {
		let white = 0;
		let dark = 0;
		let total = 0;
		for (let seed = 1; seed <= 40; seed++) {
			for (const c of buildStrip(seed, DEFAULT_COLORS)) {
				total++;
				if (DEFAULT_COLORS[c] === "#ffffff") white++;
				if (DEFAULT_COLORS[c] === "#14101f" || DEFAULT_COLORS[c] === "#282142") dark++;
			}
		}
		expect(white / total).toBeGreaterThan(0.18);
		expect(dark / total).toBeGreaterThan(0.1);
	});

	it("wraps stripIndex for negative identities", () => {
		const strip = [0, 1, 2];
		expect(stripIndex(strip, -1, 0)).toBe(2);
		expect(stripIndex(strip, 4, 1)).toBe(0);
	});
});

describe("coverage", () => {
	it("covers rightmost column first, then fully", () => {
		const cov = createCoverage(4);
		stepCoverage(cov, "cover", 0.01, 0.01, 0.1, columnDelays(4, "right", 0.02));
		expect(cov.bot[3]).toBeGreaterThan(0);
		expect(cov.bot[0]).toBe(0);
		let t = 0.01;
		let done = false;
		while (!done && t < 5) {
			t += 0.01;
			done = stepCoverage(cov, "cover", t, 0.01, 0.1, columnDelays(4, "right", 0.02));
		}
		expect(done).toBe(true);
		expect([...cov.bot]).toEqual([1, 1, 1, 1]);
		expect([...cov.top]).toEqual([0, 0, 0, 0]);
	});

	it("reveals by letting the top edge fall onto the bottom", () => {
		const cov = createCoverage(3, true);
		stepCoverage(cov, "reveal", 1, 0.05, 0.1, [0, 0, 0]);
		expect([...cov.top]).toEqual([0.5, 0.5, 0.5]);
		expect([...cov.bot]).toEqual([1, 1, 1]);
		expect(stepCoverage(cov, "reveal", 1, 0.05, 0.1, [0, 0, 0])).toBe(true);
	});

	it("reverses a half reveal from where each column is", () => {
		const cov = createCoverage(2, true);
		stepCoverage(cov, "reveal", 1, 0.03, 0.1, [0, 0, 0]);
		const top = cov.top[0]!;
		stepCoverage(cov, "cover", 1, 0.01, 0.1, [0, 0, 0]);
		expect(cov.top[0]!).toBeCloseTo(top - 0.1, 5);
		expect(cov.bot[0]).toBe(1);
	});

	it("restarts an emptied column as a fresh curtain from the top", () => {
		const cov = createCoverage(1);
		cov.top[0] = 0.4;
		cov.bot[0] = 0.4;
		stepCoverage(cov, "cover", 1, 0.01, 0.1, [0, 0, 0]);
		expect(cov.top[0]).toBe(0);
		expect(cov.bot[0]!).toBeCloseTo(0.1, 5);
	});

	it("settles instantly", () => {
		const cov = createCoverage(2);
		settleCoverage(cov, "cover");
		expect([...cov.bot]).toEqual([1, 1]);
		settleCoverage(cov, "reveal");
		expect([...cov.bot]).toEqual([0, 0]);
	});

	it("eases edges exactly at the ends", () => {
		expect(easeEdge(0)).toBe(0);
		expect(easeEdge(1)).toBe(1);
		expect(easeEdge(0.5)).toBeCloseTo(0.5, 10);
		expect(easeEdge(-1)).toBe(0);
	});
});

describe("columnDelays", () => {
	it("orders columns per sweep", () => {
		expect(columnDelays(5, "right", 1)).toEqual([4, 3, 2, 1, 0]);
		expect(columnDelays(5, "left", 1)).toEqual([0, 1, 2, 3, 4]);
		expect(columnDelays(5, "center", 1)).toEqual([2, 1, 0, 1, 2]);
		expect(columnDelays(5, "edges", 1)).toEqual([0, 1, 2, 1, 0]);
	});

	it("shuffles deterministically for random, using every slot once", () => {
		const a = columnDelays(11, "random", 1, 7);
		expect(a).toEqual(columnDelays(11, "random", 1, 7));
		expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 11 }, (_, i) => i));
	});
});

describe("columnBand", () => {
	it("curtain keeps curtain space as is", () => {
		expect(columnBand("curtain", 0, 0.2, 0.7)).toEqual({ y0: 0.2, y1: 0.7, mirror: false });
	});

	it("rise mirrors it and flips the stack", () => {
		const b = columnBand("rise", 0, 0.2, 0.7);
		expect(b.y0).toBeCloseTo(0.3, 10);
		expect(b.y1).toBeCloseTo(0.8, 10);
		expect(b.mirror).toBe(true);
	});

	it("split centres the band on the middle line", () => {
		expect(columnBand("split", 3, 0, 0.4)).toEqual({ y0: 0.3, y1: 0.7, mirror: false });
		expect(columnBand("split", 3, 1, 1)).toEqual({ y0: 0.5, y1: 0.5, mirror: false });
	});

	it("interlace alternates curtain and rise", () => {
		expect(columnBand("interlace", 0, 0, 0.5).mirror).toBe(false);
		expect(columnBand("interlace", 1, 0, 0.5).mirror).toBe(true);
	});
});

describe("resolvePalette", () => {
	it("resolves names, lists and junk", () => {
		expect(resolvePalette("mono")).toEqual([...DATAMOSH_PALETTES.mono]);
		expect(resolvePalette(["#000", "#fff"])).toEqual(["#000", "#fff"]);
		expect(resolvePalette([])).toEqual([...DEFAULT_COLORS]);
		expect(resolvePalette("nope" as never)).toEqual([...DEFAULT_COLORS]);
	});

	it("every preset keeps a light anchor and dark anchors", () => {
		for (const colors of Object.values(DATAMOSH_PALETTES)) {
			const roles = paletteRoles(colors);
			expect(luminance(colors[roles.light])!).toBeGreaterThan(0.7);
			for (const d of roles.darks) expect(luminance(colors[d])!).toBeLessThan(0.05);
		}
	});
});

describe("picture source", () => {
	it("keys slots by identity and wraps negatives", () => {
		expect(sourceSlot(7, 2, 15)).toBe(5);
		expect(sourceSlot(-1, 0, 15)).toBe(14);
		expect(sourceSlot(22, 7, 15)).toBe(sourceSlot(22, 7, 15));
	});

	it("spreads slots linearly over the middle of the picture", () => {
		const ys = Array.from({ length: 15 }, (_, s) => sourceSlotY(s, 15));
		for (let i = 1; i < ys.length; i++) expect(ys[i]!).toBeGreaterThan(ys[i - 1]!);
		expect(ys[7]!).toBeCloseTo(0.5, 10);
		expect(ys[0]!).toBeGreaterThan(0.5 - SOURCE_SPAN / 2 - 1e-9);
		expect(ys[14]!).toBeLessThan(0.5 + SOURCE_SPAN / 2 + 1e-9);
	});

	it("fits like object-fit: cover", () => {
		// wide picture into a square box: crop the sides
		expect(coverFit(200, 100, 50, 50)).toEqual({ sx: 50, sy: 0, sw: 100, sh: 100 });
		// tall picture into a wide box: crop top and bottom
		expect(coverFit(100, 200, 100, 50)).toEqual({ sx: 0, sy: 75, sw: 100, sh: 50 });
	});

	it("samples each column's centre at each slot height", () => {
		// 4×4 buffer: left half red, right half blue
		const pw = 4;
		const ph = 4;
		const px = new Uint8ClampedArray(pw * ph * 4);
		for (let y = 0; y < ph; y++) {
			for (let x = 0; x < pw; x++) {
				const k = (y * pw + x) * 4;
				px[k] = x < 2 ? 255 : 0;
				px[k + 2] = x < 2 ? 0 : 255;
				px[k + 3] = 255;
			}
		}
		const table = sampleSource(px, pw, ph, [0, 0.1, 1], 3, false);
		expect(table).toHaveLength(2);
		expect(table[0]).toHaveLength(3);
		// the narrow left column samples near x = 0: pure red
		expect(table[0]![0]).toBe("rgb(255, 0, 0)");
		// the wide right column is centred at x ≈ 0.55: a red/blue blend
		expect(table[1]![1]).toMatch(/^rgb\(\d+, 0, \d+\)$/);
	});

	it("boost stretches a dull picture, with a capped gain", () => {
		const px = new Uint8ClampedArray(2 * 2 * 4);
		// top row dim grey, bottom row mid grey
		px.set([60, 60, 60, 255, 60, 60, 60, 255, 120, 120, 120, 255, 120, 120, 120, 255]);
		const flat = sampleSource(px, 2, 2, [0, 1], 2, false).flat();
		const boosted = sampleSource(px, 2, 2, [0, 1], 2, true).flat();
		const lum = (c: string) => Number(c.match(/\d+/)![0]);
		const range = (cs: string[]) => Math.max(...cs.map(lum)) - Math.min(...cs.map(lum));
		expect(range(boosted)).toBeGreaterThan(range(flat));
		// the brightest cell is lifted, but never by more than the gain cap
		expect(Math.max(...boosted.map(lum))).toBeLessThanOrEqual(Math.round(120 * MAX_GAIN));
	});
});
