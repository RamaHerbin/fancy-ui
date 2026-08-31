import { describe, expect, it, vi } from "vitest";
import { drawWaveformFrame, fakeWaveSample, type WaveformStyle } from "./waveform-core.js";

/** Minimal recording stand-in for a 2D context (jsdom has no canvas backend). */
function stubCtx() {
	const fillStyles: string[] = [];
	const ctx = {
		clearRect: vi.fn(),
		fillRect: vi.fn(),
		set fillStyle(value: string) {
			fillStyles.push(value);
		},
		get fillStyle() {
			return fillStyles[fillStyles.length - 1] ?? "";
		},
	};
	return { ctx: ctx as unknown as CanvasRenderingContext2D, fillStyles, raw: ctx };
}

const style = (overrides: Partial<WaveformStyle> = {}): WaveformStyle => ({
	color: "#f00",
	barWidth: 3,
	gap: 1,
	minAmp: 0.1,
	mirror: false,
	...overrides,
});

describe("fakeWaveSample", () => {
	it("returns the same value for the same arguments", () => {
		expect(fakeWaveSample(7, 1234)).toBe(fakeWaveSample(7, 1234));
		expect(fakeWaveSample(0, 0)).toBe(fakeWaveSample(0, 0));
	});

	it("stays inside 0..1 across a sweep of bars and time", () => {
		for (let i = 0; i < 128; i++) {
			for (let t = 0; t < 4000; t += 137) {
				const v = fakeWaveSample(i, t);
				expect(Number.isFinite(v)).toBe(true);
				expect(v).toBeGreaterThanOrEqual(0);
				expect(v).toBeLessThanOrEqual(1);
			}
		}
	});

	it("varies over time rather than returning a constant", () => {
		expect(fakeWaveSample(3, 0)).not.toBe(fakeWaveSample(3, 500));
	});
});

describe("drawWaveformFrame", () => {
	it("clears the full surface once per frame", () => {
		const { ctx, raw } = stubCtx();
		drawWaveformFrame(ctx, [0.5], 100, 40, style());

		expect(raw.clearRect).toHaveBeenCalledTimes(1);
		expect(raw.clearRect).toHaveBeenCalledWith(0, 0, 100, 40);
	});

	it("draws floor(width / (barWidth + gap)) bars in the requested colour", () => {
		const { ctx, raw, fillStyles } = stubCtx();
		drawWaveformFrame(ctx, [0.5], 100, 40, style({ barWidth: 3, gap: 1, color: "#0ff" }));

		expect(raw.fillRect).toHaveBeenCalledTimes(25);
		expect(fillStyles).toContain("#0ff");
	});

	it("keeps bars at the minAmp floor when every sample is silent", () => {
		const { ctx, raw } = stubCtx();
		const samples = new Float32Array(16); // all zeroes
		drawWaveformFrame(ctx, samples, 40, 200, style({ minAmp: 0.25 }));

		expect(raw.fillRect).toHaveBeenCalled();
		for (const [, , , barHeight] of raw.fillRect.mock.calls) {
			expect(barHeight).toBeCloseTo(50, 5); // 0.25 * 200
		}
	});

	it("anchors bars to the bottom edge when mirror is false", () => {
		const { ctx, raw } = stubCtx();
		// width 4 with barWidth 3 + gap 1 yields exactly one bar.
		drawWaveformFrame(ctx, [0.5], 4, 100, style({ minAmp: 0, mirror: false }));

		expect(raw.fillRect).toHaveBeenCalledTimes(1);
		expect(raw.fillRect).toHaveBeenCalledWith(0, 50, 3, 50);
	});

	it("centres bars vertically when mirror is true", () => {
		const { ctx, raw } = stubCtx();
		drawWaveformFrame(ctx, [0.5], 4, 100, style({ minAmp: 0, mirror: true }));

		expect(raw.fillRect).toHaveBeenCalledTimes(1);
		expect(raw.fillRect).toHaveBeenCalledWith(0, 25, 3, 50);
	});

	it("spaces successive bars by barWidth + gap", () => {
		const { ctx, raw } = stubCtx();
		drawWaveformFrame(ctx, [1, 1, 1], 12, 100, style({ minAmp: 0 }));

		const xs = raw.fillRect.mock.calls.map(([x]) => x);
		expect(xs).toEqual([0, 4, 8]);
	});

	it("reaches the end of the sample buffer with its last bar", () => {
		const { ctx, raw } = stubCtx();
		// 16 samples, silent except the very last one, drawn as 4 bars.
		const samples = new Float32Array(16);
		samples[15] = 1;
		drawWaveformFrame(ctx, samples, 16, 100, style({ barWidth: 3, gap: 1, minAmp: 0 }));

		const heights = raw.fillRect.mock.calls.map(([, , , h]) => h);
		expect(heights).toHaveLength(4);
		expect(heights[3]).toBe(100);
	});

	it("takes the peak of each bar's slice rather than one sample point", () => {
		const { ctx, raw } = stubCtx();
		// A transient between the points a single-sample bar would have read.
		const samples = [0, 0, 1, 0, 0, 0, 0, 0];
		drawWaveformFrame(ctx, samples, 8, 100, style({ barWidth: 3, gap: 1, minAmp: 0 }));

		const heights = raw.fillRect.mock.calls.map(([, , , h]) => h);
		expect(heights).toHaveLength(2);
		expect(heights[0]).toBe(100);
	});

	it("gives every bar a sample when there are more bars than samples", () => {
		const { ctx, raw } = stubCtx();
		drawWaveformFrame(ctx, [1], 40, 100, style({ barWidth: 3, gap: 1, minAmp: 0 }));

		const heights = raw.fillRect.mock.calls.map(([, , , h]) => h);
		expect(heights).toHaveLength(10);
		for (const h of heights) expect(h).toBe(100);
	});

	it("draws nothing but still clears when the surface is too small for a bar", () => {
		const { ctx, raw } = stubCtx();
		drawWaveformFrame(ctx, [0.5], 2, 100, style());

		expect(raw.clearRect).toHaveBeenCalledTimes(1);
		expect(raw.fillRect).not.toHaveBeenCalled();
	});

	it("does not throw on an empty sample buffer", () => {
		const { ctx, raw } = stubCtx();
		expect(() => drawWaveformFrame(ctx, [], 40, 100, style({ minAmp: 0.2 }))).not.toThrow();
		expect(raw.fillRect).toHaveBeenCalledTimes(10);
	});
});
