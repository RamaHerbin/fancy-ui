import { describe, expect, it } from "vitest";
import { buildBubble, type BubbleKind, type BubbleOptions, type TailSide } from "./handwrite-bubble.js";
import type { BBox } from "./handwrite-shapes.js";

const box: BBox = { minX: 0, minY: -0.7, maxX: 3, maxY: 0.24 };
const opts = (o: Partial<BubbleOptions> = {}): BubbleOptions => ({
	kind: "speech",
	tail: "bottom",
	tailOffset: 0.25,
	padding: 0.35,
	seed: 3,
	...o,
});

describe("buildBubble", () => {
	it("draws nothing for 'none'", () => {
		expect(buildBubble(box, opts({ kind: "none" })).strokes).toEqual([]);
	});

	it.each(["speech", "thought", "shout"] as BubbleKind[])("encloses the formula with padding: %s", (kind) => {
		const { strokes, bbox } = buildBubble(box, opts({ kind }));
		expect(strokes.length).toBeGreaterThanOrEqual(2);
		expect(strokes.every((s) => s.kind === "bubble" && s.glyph < 0)).toBe(true);
		expect(bbox.minX).toBeLessThan(box.minX - 0.3);
		expect(bbox.maxX).toBeGreaterThan(box.maxX + 0.3);
		expect(bbox.minY).toBeLessThan(box.minY - 0.3);
		expect(bbox.maxY).toBeGreaterThan(box.maxY + 0.3);
	});

	it("draws the speech outline in two passes, the first overshooting its join", () => {
		const { strokes } = buildBubble(box, opts());
		expect(strokes).toHaveLength(2);
		const [first] = strokes;
		const start = first.points[0];
		const end = first.points[first.points.length - 1];
		expect(Math.hypot(end[0] - start[0], end[1] - start[1])).toBeGreaterThan(0.01);
	});

	it.each([
		["bottom", (b: BBox) => b.maxY, box.maxY + 0.35],
		["top", (b: BBox) => -b.minY, -(box.minY - 0.35)],
		["right", (b: BBox) => b.maxX, box.maxX + 0.35],
		["left", (b: BBox) => -b.minX, -(box.minX - 0.35)],
	] as [TailSide, (b: BBox) => number, number][])("puts the speech tail on the %s side", (tail, extent, edge) => {
		const { bbox } = buildBubble(box, opts({ tail }));
		expect(extent(bbox)).toBeGreaterThan(edge + 0.4);
	});

	it("moves the tail along its side with the offset", () => {
		const tipX = (tailOffset: number) => {
			const pts = buildBubble(box, opts({ tailOffset })).strokes[0].points;
			return pts.reduce((best, p) => (p[1] > best[1] ? p : best))[0];
		};
		expect(tipX(0.9)).toBeGreaterThan(tipX(0.1) + 1);
	});

	it("trails two small puffs from a thought bubble", () => {
		const { strokes } = buildBubble(box, opts({ kind: "thought" }));
		expect(strokes).toHaveLength(4);
	});

	it("is deterministic per seed", () => {
		expect(buildBubble(box, opts({ kind: "shout" }))).toEqual(buildBubble(box, opts({ kind: "shout" })));
		expect(buildBubble(box, opts({ seed: 4 })).strokes[0].points).not.toEqual(buildBubble(box, opts()).strokes[0].points);
	});
});
