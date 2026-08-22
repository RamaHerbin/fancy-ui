import { describe, it, expect } from "vitest";
import {
	buildLayerBackgrounds,
	buildOscillators,
	motionPreset,
	oscillate,
	parseRgb,
	LAYER_PRESETS,
	type Oscillator,
} from "./pulse-beam-data";

const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("oscillate", () => {
	const o: Oscillator = { prop: "--x", a: 0.5, b: 1.5, period: 2, delay: 0.25, unit: "" };

	it("returns a at t = delay and b half a period later", () => {
		expect(oscillate(o, 0.25)).toBeCloseTo(0.5, 6);
		expect(oscillate(o, 1.25)).toBeCloseTo(1.5, 6);
		expect(oscillate(o, 2.25)).toBeCloseTo(0.5, 6);
	});

	it("stays within [min(a,b), max(a,b)]", () => {
		for (let t = -3; t < 9; t += 0.137) {
			const v = oscillate(o, t);
			expect(v).toBeGreaterThanOrEqual(0.5 - 1e-9);
			expect(v).toBeLessThanOrEqual(1.5 + 1e-9);
		}
	});
});

describe("buildOscillators", () => {
	it("yields the 17 animated properties with px units on drift", () => {
		const list = buildOscillators(motionPreset("inner", "dark"));
		expect(list).toHaveLength(17);
		const props = list.map((o) => o.prop);
		for (const r of [1, 2, 3]) {
			expect(props).toContain(`--pb-bw${r}`);
			expect(props).toContain(`--pb-bh${r}`);
			expect(props).toContain(`--pb-bx${r}`);
			expect(props).toContain(`--pb-by${r}`);
		}
		expect(props).toContain("--pb-gh");
		for (const q of ["tl", "tr", "bl", "br"]) expect(props).toContain(`--pb-op-${q}`);
		for (const o of list) {
			expect(o.unit).toBe(/--pb-b[xy]\d/.test(o.prop) ? "px" : "");
			expect(o.period).toBeGreaterThan(0);
		}
	});

	it("corner alphas breathe between 1 - op and 1 with staggered delays", () => {
		const m = motionPreset("inner", "dark");
		const list = buildOscillators(m);
		const tl = list.find((o) => o.prop === "--pb-op-tl")!;
		const br = list.find((o) => o.prop === "--pb-op-br")!;
		expect(tl.a).toBeCloseTo(1 - m.op);
		expect(tl.b).toBe(1);
		expect(tl.delay).toBe(0);
		expect(br.delay).toBeGreaterThan(0);
	});
});

describe("motionPreset", () => {
	it("divides the breathing periods by speed and leaves the hue period alone", () => {
		const base = motionPreset("inner", "dark", 1);
		const fast = motionPreset("inner", "dark", 2);
		expect(fast.bs).toBeCloseTo(base.bs / 2);
		expect(fast.ss).toBeCloseTo(base.ss / 2);
		expect(fast.ghs).toBeCloseTo(base.ghs / 2);
		expect(fast.huePeriod).toBe(base.huePeriod);
	});

	it("ignores non-positive or non-finite speed", () => {
		expect(motionPreset("outside", "light", 0).bs).toBe(motionPreset("outside", "light").bs);
		expect(motionPreset("outside", "light", NaN).ss).toBe(motionPreset("outside", "light").ss);
	});
});

describe("parseRgb", () => {
	it("parses hex and rgb() forms", () => {
		expect(parseRgb("#f00")).toEqual([255, 0, 0]);
		expect(parseRgb("#0080FF")).toEqual([0, 128, 255]);
		expect(parseRgb("rgb(1, 2, 3)")).toEqual([1, 2, 3]);
		expect(parseRgb("rgba(4 5 6 / 0.5)")).toEqual([4, 5, 6]);
	});

	it("returns null for anything else", () => {
		expect(parseRgb("var(--primary)")).toBeNull();
		expect(parseRgb("oklch(0.7 0.1 200)")).toBeNull();
		expect(parseRgb("red")).toBeNull();
	});
});

describe("buildLayerBackgrounds", () => {
	const inner = buildLayerBackgrounds({
		variant: "inner",
		palette: "colorful",
		tone: "dark",
		op: 0.48,
	});
	const outside = buildLayerBackgrounds({
		variant: "outside",
		palette: "colorful",
		tone: "dark",
		op: 0.46,
	});

	it("inner: 9 stroke, 13 glow (9 + 4 corner dots), 7 bloom gradients", () => {
		expect(count(inner.stroke, "radial-gradient(")).toBe(9);
		expect(count(inner.glow, "radial-gradient(")).toBe(13);
		expect(count(inner.bloom, "radial-gradient(")).toBe(7);
	});

	it("outside: 8 stroke, 8 glow, 7 bloom gradients, scaled by --pb-sx / --pb-sy", () => {
		expect(count(outside.stroke, "radial-gradient(")).toBe(8);
		expect(count(outside.glow, "radial-gradient(")).toBe(8);
		expect(count(outside.bloom, "radial-gradient(")).toBe(7);
		expect(outside.stroke).toContain("var(--pb-sx, 1)");
		expect(outside.bloom).toContain("var(--pb-sy, 1)");
		expect(inner.stroke).not.toContain("--pb-sx");
	});

	it("animated layers carry fallbacks for every custom property", () => {
		expect(inner.stroke).toContain("var(--pb-bw1, 1)");
		expect(inner.stroke).toContain("var(--pb-gh, 1)");
		expect(inner.stroke).toContain("var(--pb-bx1, 0px)");
		expect(inner.stroke).toContain("var(--pb-op-tl, 1)");
		expect(inner.glow).toContain("calc(0.18 * var(--pb-op-tr, 1))");
	});

	it("bloom is static with alpha 1 - op / 2", () => {
		expect(inner.bloom).not.toContain("var(--pb-bw");
		expect(inner.bloom).toContain("rgba(255, 50, 100, 0.76)");
	});

	it("light tone uses dark corner dots", () => {
		const light = buildLayerBackgrounds({
			variant: "inner",
			palette: "ocean",
			tone: "light",
			op: 0.45,
		});
		expect(light.glow).toContain("rgba(0, 0, 0, calc(0.08 * var(--pb-op-tl, 1)))");
	});

	it("colors override maps onto the slots in order", () => {
		const custom = buildLayerBackgrounds({
			variant: "inner",
			palette: "colorful",
			colors: ["#ff0000", "var(--accent)"],
			tone: "dark",
			op: 0.48,
		});
		expect(custom.stroke).toContain("rgba(255, 0, 0, var(--pb-op-tl, 1))");
		expect(custom.stroke).toContain(
			"color-mix(in srgb, var(--accent) calc(var(--pb-op-tl, 1) * 100%), transparent)"
		);
		// two colours cycle over the nine slots
		expect(count(custom.stroke, "rgba(255, 0, 0")).toBe(5);
	});

	it("presets exist for every variant and tone", () => {
		for (const v of ["inner", "outside"] as const) {
			for (const t of ["dark", "light"] as const) {
				const p = LAYER_PRESETS[v][t];
				expect(p.stroke).toBeGreaterThan(0);
				expect(p.bloomBlur).toBeGreaterThan(0);
			}
		}
	});
});
