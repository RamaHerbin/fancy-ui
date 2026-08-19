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
 * gap))` bars. Each bar covers its own slice of the buffer and takes that
 * slice's peak, so the last bar reaches the end of the buffer and a transient
 * between two sample points is never skipped. Bar height is
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

	const perBar = sampleCount / barCount;

	for (let i = 0; i < barCount; i++) {
		let sample = 0;
		if (sampleCount > 0) {
			// More bars than samples leaves empty slices: those fall back to the one
			// sample the slice starts on. The last bar always closes on the buffer's
			// end so recent audio cannot fall off the right edge.
			const from = Math.min(Math.floor(i * perBar), sampleCount - 1);
			const to =
				i === barCount - 1 ? sampleCount : Math.max(Math.floor((i + 1) * perBar), from + 1);
			for (let s = from; s < to; s++) sample = Math.max(sample, clamp01(samples[s] ?? 0));
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
