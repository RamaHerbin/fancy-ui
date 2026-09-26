import { describe, it, expect } from "vitest";
import {
	variantMap,
	ImageTrailVariantPixelated,
	revealFragments,
	type RevealPattern,
	type VariantType,
} from "./trail-variants.js";

describe("trail-variants pixelated", () => {
	it("accepts pixelated as a VariantType", () => {
		const variant: VariantType = "pixelated";
		expect(variant).toBe("pixelated");
	});

	it("has a pixelated entry in variantMap pointing at ImageTrailVariantPixelated", () => {
		expect(variantMap.pixelated).toBe(ImageTrailVariantPixelated);
	});

	it("keeps all 18 variant keys in variantMap", () => {
		expect(Object.keys(variantMap).sort()).toEqual(
			[
				"type1",
				"type2",
				"type3",
				"type4",
				"type5",
				"type6",
				"type7",
				"type8",
				"pixelated",
				"scale",
				"fall",
				"gravity",
				"flame",
				"venetian",
				"curtain",
				"hexagon",
				"liquid",
				"zoom-split",
			].sort()
		);
	});
});

const PATTERNS: RevealPattern[] = ["venetian", "curtain", "hexagon", "liquid", "zoom-split"];
const numbers = (clip: string) => clip.match(/-?\d+(\.\d+)?/g) ?? [];

describe("revealFragments", () => {
	it.each(PATTERNS)("%s: closed and open share a shape, so they interpolate", (pattern) => {
		for (const f of revealFragments(pattern)) {
			expect(f.closed.split("(")[0]).toBe(f.open.split("(")[0]);
			expect(numbers(f.closed).length).toBe(numbers(f.open).length);
			expect(f.order).toBeGreaterThanOrEqual(0);
			expect(f.order).toBeLessThanOrEqual(1);
		}
	});

	it("has the expected fragment counts", () => {
		expect(revealFragments("venetian")).toHaveLength(6);
		expect(revealFragments("curtain")).toHaveLength(6);
		expect(revealFragments("hexagon")).toHaveLength(9);
		expect(revealFragments("liquid")).toHaveLength(5);
		expect(revealFragments("zoom-split")).toHaveLength(4);
	});

	it("opens the venetian slats top to bottom, the curtain from the middle out", () => {
		const v = revealFragments("venetian").map((f) => f.order);
		expect([...v].sort((a, b) => a - b)).toEqual(v);
		const c = revealFragments("curtain").map((f) => f.order);
		expect(Math.min(...c)).toBe(c[2]);
		expect(c[0]).toBe(1);
		expect(c[5]).toBe(1);
	});

	it("covers the whole picture once open (venetian slats tile 0–100%)", () => {
		const ys = revealFragments("venetian").flatMap((f) =>
			numbers(f.open)
				.map(Number)
				.filter((_, i) => i % 2)
		);
		expect(Math.min(...ys)).toBe(0);
		expect(Math.max(...ys)).toBe(100);
	});
});

function makeContainer(count = 3) {
	const container = document.createElement("div");
	for (let i = 0; i < count; i++) {
		const el = document.createElement("div");
		el.className = "content__img";
		const inner = document.createElement("div");
		inner.className = "content__img-inner";
		inner.style.backgroundImage = `url(/img${i}.jpg)`;
		el.appendChild(inner);
		container.appendChild(el);
	}
	document.body.appendChild(container);
	return container;
}

describe("new variants", () => {
	const NEW: VariantType[] = ["scale", "fall", "gravity", "flame", ...PATTERNS];

	it.each(NEW)("%s builds and cleans up after itself", (variant) => {
		const container = makeContainer();
		const instance = new variantMap[variant](container);
		instance.destroy();
		expect(container.querySelectorAll(".content__img-frag")).toHaveLength(0);
		for (const inner of container.querySelectorAll<HTMLDivElement>(".content__img-inner")) {
			expect(inner.style.opacity).toBe("");
		}
		container.remove();
	});

	it.each(PATTERNS)("%s draws each picture from its fragments while active", (pattern) => {
		const container = makeContainer(2);
		const instance = new variantMap[pattern](container);
		const n = revealFragments(pattern).length;
		for (const el of container.querySelectorAll(".content__img")) {
			const frags = el.querySelectorAll<HTMLDivElement>(".content__img-frag");
			expect(frags).toHaveLength(n);
			expect(frags[0].style.backgroundImage).toContain("/img");
			expect(el.querySelector<HTMLDivElement>(".content__img-inner")!.style.opacity).toBe("0");
		}
		instance.destroy();
		container.remove();
	});
});
