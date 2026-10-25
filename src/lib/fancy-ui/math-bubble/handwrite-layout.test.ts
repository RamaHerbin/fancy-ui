import { describe, expect, it } from "vitest";
import type { GlyphTable } from "./handwrite-glyph-types.js";
import { exemplar } from "./glyphs/exemplar.js";
import { glyphs } from "./glyphs/index.js";
import { inkStrokes } from "./handwrite-hand.js";
import { layoutFormula } from "./handwrite-layout.js";
import { parseFormula } from "./handwrite-parse.js";
import { hashSeed, mulberry32, seedFromString } from "./handwrite-prng.js";

/** Exemplar plus a few flat shapes, so the tests do not depend on the full alphabet. */
const table: GlyphTable = {
	...exemplar,
	"2": { adv: 0.45, strokes: [[[0.08, -0.6], [0.3, -0.7], [0.36, -0.5], [0.08, 0], [0.4, 0]]] },
	"=": { adv: 0.5, strokes: [[[0.08, -0.32], [0.42, -0.32]], [[0.08, -0.18], [0.42, -0.18]]] },
	"∑": { adv: 0.6, strokes: [[[0.5, -0.7], [0.08, -0.7], [0.3, -0.35], [0.08, 0], [0.52, 0]]] },
};

const lay = (src: string) => layoutFormula(parseFormula(src), table);
const ys = (pts: number[][]) => pts.map((p) => p[1]);

describe("layoutFormula", () => {
	it("writes a fraction's bar after its numerator and before its denominator", () => {
		const { strokes } = lay("\\frac{a}{1}");
		expect(strokes.map((s) => s.kind)).toEqual(["ink", "rule", "ink"]);
		const [num, bar, den] = strokes;
		expect(Math.max(...ys(num.points))).toBeLessThan(bar.points[0][1]);
		expect(Math.min(...ys(den.points))).toBeGreaterThan(bar.points[0][1]);
		// The bar sits on the math axis and overhangs its content.
		expect(bar.points[1][1]).toBeCloseTo(-0.25, 5);
		const xs = [...num.points, ...den.points].map((p) => p[0]);
		expect(bar.points[0][0]).toBeLessThan(Math.min(...xs));
		expect(bar.points[2][0]).toBeGreaterThan(Math.max(...xs));
	});

	it("sets a superscript smaller and raised", () => {
		const base = lay("a").strokes[0];
		const [, sup] = lay("a^a").strokes;
		expect(sup.scale).toBeCloseTo(0.62, 5);
		const h = (pts: number[][]) => Math.max(...ys(pts)) - Math.min(...ys(pts));
		expect(h(sup.points)).toBeLessThan(h(base.points));
		expect(Math.max(...ys(sup.points))).toBeLessThan(-0.3);
		const [, sub] = lay("a_1").strokes;
		expect(Math.max(...ys(sub.points))).toBeGreaterThan(0.15);
	});

	it("grows the bounding box with the content", () => {
		const small = lay("a").bbox;
		const wide = lay("aaa").bbox;
		const tall = lay("\\frac{a}{a}").bbox;
		expect(wide.maxX).toBeGreaterThan(small.maxX);
		expect(tall.maxY - tall.minY).toBeGreaterThan(small.maxY - small.minY);
	});

	it("puts \\sum limits under and over, and \\int scripts at the side", () => {
		const [op, sup, sub] = lay("\\sum_1^2").strokes;
		expect(Math.max(...ys(sub.points))).toBeGreaterThan(Math.max(...ys(op.points)));
		expect(Math.min(...ys(sup.points))).toBeLessThan(Math.min(...ys(op.points)));
		const w = Math.max(...op.points.map((p) => p[0])) - Math.min(...op.points.map((p) => p[0]));
		expect(w).toBeGreaterThan(0.44 * 1.3); // 1.4× the glyph
	});

	it("draws the radical with an overbar over the radicand", () => {
		const { strokes } = lay("\\sqrt{a}");
		expect(strokes.map((s) => s.kind)).toEqual(["ink", "ink", "rule"]);
		const bar = strokes[2];
		expect(bar.points[0][1]).toBeLessThan(Math.min(...ys(strokes[1].points)));
	});

	it("stretches parentheses to tall content", () => {
		const plain = lay("(a)").strokes[0];
		const tall = lay("\\left(\\frac{a}{a}\\right)").strokes[0];
		const h = (pts: number[][]) => Math.max(...ys(pts)) - Math.min(...ys(pts));
		expect(h(tall.points)).toBeGreaterThan(h(plain.points) * 1.15);
	});

	it("advances over a missing glyph without ink, and marks strokes after a space", () => {
		const { strokes, width } = lay("a@a");
		expect(strokes).toHaveLength(2);
		expect(width).toBeCloseTo(0.5 + 0.4 + 0.5, 5);
		expect(lay("a a").strokes[1].afterSpace).toBe(true);
	});

	it("gives each glyph its own id, shared by its strokes", () => {
		const { strokes } = lay("π1");
		expect(strokes.slice(0, 3).every((s) => s.glyph === strokes[0].glyph)).toBe(true);
		expect(strokes[3].glyph).not.toBe(strokes[0].glyph);
	});
});

describe("prng and hand", () => {
	it("mulberry32 repeats for a seed and differs across seeds", () => {
		const a = mulberry32(42);
		const b = mulberry32(42);
		const seq = Array.from({ length: 5 }, () => a());
		expect(Array.from({ length: 5 }, () => b())).toEqual(seq);
		expect(mulberry32(43)()).not.toBe(seq[0]);
		expect(seq.every((v) => v >= 0 && v < 1)).toBe(true);
		expect(hashSeed(1, 2)).toBe(hashSeed(1, 2));
		expect(seedFromString("e^x")).toBe(seedFromString("e^x"));
	});

	it("inks the same strokes for the same seed, other strokes for another", () => {
		const laid = () => lay("\\frac{\\pi}{a^2}").strokes;
		const one = inkStrokes(laid(), { seed: 7, pxPerEm: 40 });
		expect(inkStrokes(laid(), { seed: 7, pxPerEm: 40 })).toEqual(one);
		expect(inkStrokes(laid(), { seed: 8, pxPerEm: 40 })[0].points).not.toEqual(one[0].points);
	});

	it("smooths to short segments and tapers the pressure at both ends", () => {
		const [ink] = inkStrokes(lay("1").strokes, { seed: 1, pxPerEm: 100 });
		for (let i = 1; i < ink.points.length; i++) expect(ink.arc[i] - ink.arc[i - 1]).toBeLessThan(0.035);
		const mid = ink.widths[Math.floor(ink.widths.length / 2)];
		expect(ink.widths[0]).toBeLessThan(mid);
		expect(ink.widths[ink.widths.length - 1]).toBeLessThan(mid);
	});

	it("merges the glyph files with ASCII aliases", () => {
		expect(glyphs.a).toBe(exemplar.a);
		if (glyphs["−"]) expect(glyphs["-"]).toBe(glyphs["−"]);
		if (glyphs["·"]) expect(glyphs["*"]).toBe(glyphs["·"]);
	});
});
