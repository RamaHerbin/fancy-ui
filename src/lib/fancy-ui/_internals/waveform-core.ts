/**
 * Waveform rendering primitives.
 *
 * Pure drawing math kept out of the component so it can be unit-tested against
 * a stub 2D context: given a context and a set of 0..1 samples, paint one frame
 * of vertical bars. No canvas, timing, or DOM access lives here.
 */

export interface WaveformStyle {
	/** Any canvas fill style — solid colour, gradient string, etc. */
	color: string;
	/** Bar thickness in pixels. */
	barWidth: number;
	/** Empty space between bars, in pixels. */
	gap: number;
	/** Amplitude floor (0..1) so an idle signal still reads as a waveform. */
	minAmp: number;
	/** True centres each bar vertically; false grows it up from the bottom. */
	mirror: boolean;
}

function clamp01(value: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
}

/**
 * Paints one frame: clears the surface, then draws `floor(width / (barWidth +
 * gap))` bars, each sampling `samples` linearly across its length. Bar height is
 * `max(minAmp, sample) * height`, so a silent signal still shows a floor.
 */
export function drawWaveformFrame(
	ctx: CanvasRenderingContext2D,
	samples: ArrayLike<number>,
	width: number,
	height: number,
	style: WaveformStyle
): void {
	ctx.clearRect(0, 0, width, height);

	const step = style.barWidth + style.gap;
	if (step <= 0 || width <= 0 || height <= 0) return;

	const barCount = Math.floor(width / step);
	if (barCount <= 0) return;

	const floorAmp = clamp01(style.minAmp);
	const sampleCount = samples.length;
	ctx.fillStyle = style.color;

	for (let i = 0; i < barCount; i++) {
		let sample = 0;
		if (sampleCount > 0) {
			const index = Math.min(sampleCount - 1, Math.floor((i / barCount) * sampleCount));
			sample = clamp01(samples[index] ?? 0);
		}

		const barHeight = Math.max(floorAmp, sample) * height;
		const x = i * step;
		const y = style.mirror ? (height - barHeight) / 2 : height - barHeight;
		ctx.fillRect(x, y, style.barWidth, barHeight);
	}
}

/**
 * Stand-in amplitude for an idle or unmetered source: layered sines of the bar
 * index and the elapsed time. Deterministic — same arguments, same value — so
 * frames stay reproducible in tests and across a re-render.
 */
export function fakeWaveSample(i: number, tMs: number): number {
	return clamp01(
		0.5 +
			0.2 * Math.sin(i * 0.35 + tMs * 0.004) +
			0.15 * Math.sin(i * 0.13 - tMs * 0.002) +
			0.1 * Math.sin(tMs * 0.008)
	);
}
