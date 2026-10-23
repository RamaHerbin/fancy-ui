import { describe, expect, it } from "vitest";
import { GLOW_PEAK, createGrid, pixelHalos, type PixelGrid } from "./pixel-scene-core.js";
import { PIXEL_SCENES, getScenePainter, type PixelSceneName } from "./pixel-scene-scenes.js";

const SIZES = [
	[256, 68],
	[64, 40],
	[400, 180],
] as const;

function paint(
	name: PixelSceneName,
	cols: number,
	rows: number,
	t: number,
	night: boolean
): PixelGrid {
	const g = createGrid(cols, rows);
	getScenePainter(name)(t, g, night);
	pixelHalos(g);
	return g;
}

describe("scenes", () => {
	it("lists the four scenes, alpine first", () => {
		expect(PIXEL_SCENES).toEqual(["alpine", "meadow", "sea", "mountains"]);
	});

	for (const name of PIXEL_SCENES)
		for (const night of [false, true])
			it(`${name} ${night ? "night" : "day"} paints in range, deterministically, at every size`, () => {
				for (const [cols, rows] of SIZES)
					for (const t of [0, 1e6]) {
						const a = paint(name, cols, rows, t, night);
						const b = paint(name, cols, rows, t, night);
						expect(a.color).toEqual(b.color);
						expect(a.inkA).toEqual(b.inkA);
						expect(a.glow).toEqual(b.glow);
						let filled = 0;
						let bad = 0;
						for (let i = 0; i < a.color.length; i++) {
							const c = a.color[i]!;
							if (c < -1 || c > 0xffffff) bad++;
							if (c >= 0) filled++;
							if (!(a.glow[i]! <= GLOW_PEAK + 1e-6)) bad++;
							if (!Number.isFinite(a.inkA[i]!)) bad++;
						}
						expect(bad).toBe(0);
						// every scene covers (nearly) its whole box; mountains leaves a strip under its floor line
						expect(filled / a.color.length).toBeGreaterThan(0.9);
						let outside = 0;
						for (let e = 0; e < a.emitters.length; e += 5) {
							const ex = a.emitters[e]!;
							const ey = a.emitters[e + 1]!;
							if (ex < 0 || ex >= cols || ey < 0 || ey >= rows) outside++;
						}
						expect(outside).toBe(0);
					}
			});

	it("falls back to alpine for an unknown name", () => {
		expect(getScenePainter("nope" as PixelSceneName)).toBe(getScenePainter("alpine"));
	});

	it("two sizes painted in turn do not leak state into each other", () => {
		const a1 = paint("alpine", 256, 68, 5000, true);
		paint("alpine", 64, 40, 5000, false);
		const a2 = paint("alpine", 256, 68, 5000, true);
		expect(a2.color).toEqual(a1.color);
	});

	it("night lights windows, stars and the moon above SDR white; day has no sun in alpine", () => {
		const n = paint("alpine", 256, 68, 20000, true);
		const d = paint("alpine", 256, 68, 20000, false);
		const hot = (g: PixelGrid) => [...g.glow].filter((v) => v >= 3.4).length;
		expect(hot(n)).toBeGreaterThan(20);
		expect(hot(d)).toBe(0);
	});

	// Copy legibility: the kicker / H1 / paragraph sit top-left (cols 7–99,
	// rows 7–33 at cell 5 on 1280×340). Pinned at the measured worst case over
	// four times (day 0.0255, night 0.0315) + 0.02.
	it("keeps the alpine copy corner sparse", () => {
		for (const night of [false, true])
			for (const t of [0, 37000, 123456, 1e6]) {
				const g = paint("alpine", 256, 68, t, night);
				let n = 0;
				let busy = 0;
				for (let y = 7; y <= 33; y++)
					for (let x = 7; x <= 99; x++) {
						const i = y * 256 + x;
						n++;
						if (g.lit[i] || g.inkA[i]! >= 0.3) busy++;
					}
				expect(busy / n).toBeLessThanOrEqual(night ? 0.052 : 0.046);
			}
	});

	it("marks the copy corner on every scene, so the lens is not boosted there", () => {
		for (const name of PIXEL_SCENES) {
			const g = paint(name, 256, 68, 0, false);
			expect(g.copyW).toBeCloseTo(256 * 0.42, 6);
			expect(g.copyH).toBeCloseTo(68 * 0.52, 6);
		}
	});
});
