import { describe, expect, it, vi } from "vitest";
import type { GlyphTable } from "./handwrite-glyph-types.js";
import { exemplar } from "./glyphs/exemplar.js";
import { createMathBubble } from "./handwrite-core.js";
import { toSvgPaths, type PenContext } from "./handwrite-draw.js";
import type { InkStroke } from "./handwrite-hand.js";
import { buildTimeline, easeOut, frameAt } from "./handwrite-timeline.js";

const table: GlyphTable = exemplar;

function line(length: number, glyph: number, kind: InkStroke["kind"] = "ink", afterSpace = false): InkStroke {
	return {
		points: [
			[0, 0],
			[length, 0],
		],
		widths: [1, 1],
		arc: [0, length],
		length,
		kind,
		glyph,
		afterSpace,
	};
}

describe("buildTimeline", () => {
	const strokes = [line(4, -1, "bubble"), line(2, -2, "bubble"), line(1, 1), line(0.1, 1), line(1, 2), line(1, 3, "ink", true)];
	const tl = buildTimeline(strokes, { speed: 5 });

	it("draws the bubble first, in about 450 ms split by length", () => {
		expect(tl.strokes[0].duration).toBeCloseTo(300, 5);
		expect(tl.strokes[1].start).toBeCloseTo(300, 5);
		expect(tl.bubbleEnd).toBeCloseTo(450, 5);
		expect(tl.writeStart).toBeCloseTo(550, 5);
	});

	it("starts strokes in order, after pen lifts sized by what separates them", () => {
		const starts = tl.strokes.map((s) => s.start);
		for (let i = 1; i < starts.length; i++) expect(starts[i]).toBeGreaterThan(starts[i - 1]);
		const ink = tl.strokes.slice(2);
		const gap = (i: number) => ink[i].start - ink[i - 1].start - ink[i - 1].duration;
		expect(ink[0].duration).toBeCloseTo(200, 5); // 1 em at 5 em/s
		expect(ink[1].duration).toBe(60); // the minimum
		expect(gap(1)).toBeCloseTo(80, 5); // same glyph
		expect(gap(2)).toBeCloseTo(100, 5); // next glyph
		expect(gap(3)).toBeCloseTo(150, 5); // after a space
	});

	it("ends at the sum of durations and pauses", () => {
		const sum = 450 + 100 + 200 + 80 + 60 + 100 + 200 + 150 + 200;
		expect(tl.duration).toBeCloseTo(sum, 5);
	});

	it("reveals by eased arc length and tracks the pen", () => {
		expect(frameAt(tl, 0).strokes.every((s) => s.fraction === 0)).toBe(true);
		const mid = frameAt(tl, tl.writeStart + 100);
		expect(mid.strokes[2].fraction).toBeCloseTo(easeOut(0.5), 5);
		expect(mid.pen?.[0]).toBeCloseTo(easeOut(0.5), 5);
		const end = frameAt(tl, tl.duration);
		expect(end.done).toBe(true);
		expect(end.pen).toBeNull();
		expect(end.strokes.every((s) => s.fraction === 1)).toBe(true);
	});
});

describe("createMathBubble", () => {
	const make = (seed = 5) => createMathBubble("\\frac{\\pi}{a^1}", { seed, glyphs: table, size: 40 });

	it("sizes the canvas to the drawing and puts the bubble before the writing", () => {
		const mb = make();
		expect(mb.size.width).toBeGreaterThan(40);
		expect(mb.strokes[0].kind).toBe("bubble");
		const firstInk = mb.timeline.strokes.find((s) => s.stroke.kind !== "bubble");
		expect(firstInk?.start).toBeGreaterThanOrEqual(mb.timeline.bubbleEnd);
	});

	it("draws variable-width segments on a context", () => {
		const calls: number[] = [];
		const ctx: PenContext = {
			beginPath: vi.fn(),
			moveTo: vi.fn(),
			lineTo: vi.fn(),
			stroke: vi.fn(),
			set lineWidth(v: number) {
				calls.push(v);
			},
			get lineWidth() {
				return calls[calls.length - 1] ?? 1;
			},
			strokeStyle: "",
			lineCap: "butt",
			lineJoin: "miter",
		};
		const mb = make();
		mb.draw(ctx, mb.timeline.duration);
		expect(ctx.lineCap).toBe("round");
		expect(new Set(calls).size).toBeGreaterThan(2);
		expect(ctx.stroke).toHaveBeenCalled();
	});

	it("gives deterministic, non-empty SVG paths of the finished frame", () => {
		const svg = make().svg();
		expect(svg.paths.length).toBe(make().strokes.length);
		expect(svg.paths.every((p) => /^M[\d.-]+ [\d.-]+L/.test(p.d) && p.width > 0)).toBe(true);
		expect(make().svg()).toEqual(svg);
		expect(make(6).svg()).not.toEqual(svg);
		const style = { color: "#000", strokeWidth: 2, scale: 10, offsetX: 0, offsetY: 0 };
		expect(toSvgPaths([line(1, 1)], style)[0]).toEqual({ d: "M0 0L10 0", width: 2, kind: "ink" });
	});

	it("survives formulas it cannot fully write", () => {
		expect(() => createMathBubble("\\frac{\\unknown}{", { glyphs: table }).svg()).not.toThrow();
		expect(createMathBubble("", { bubble: "none", glyphs: table }).timeline.duration).toBe(0);
	});
});
