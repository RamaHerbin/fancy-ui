/**
 * Near-uniform frame detection for gallery thumbnails. A capture whose pixels
 * are (almost) all one colour means the demo did not render, so the capture
 * script fails the slug instead of writing a blank WebP.
 *
 * isNearUniform is self-contained (no module-level bindings) on purpose: the
 * capture script serialises it with `.toString()` and runs it inside the
 * browser on the full-resolution capture, so the unit tests and the real check
 * share one implementation. A downsampled canvas read would skip thin glyphs.
 */

/**
 * Background = the most common colour (5 bits per channel). A pixel is content
 * when any channel is more than 10 away from it. A frame is blank when fewer
 * than 0.04% of its pixels are content: blank frames measure 0, the sparsest
 * real thumbnails (a lone icon button, a toggle, a tooltip, meteors) measure
 * about 0.06-0.7%, so the line sits below all of them.
 *
 * @param {Uint8ClampedArray | Uint8Array} rgba RGBA pixels, row-major
 * @param {number} width
 * @param {number} height
 * @returns {boolean} true when the frame is blank or nearly so
 */
export function isNearUniform(rgba, width, height) {
	const CHANNEL_TOLERANCE = 10;
	const MIN_CONTENT_SHARE = 0.0004;
	const total = width * height;
	if (total === 0) return true;
	// Dominant colour: the most common 5-bit-per-channel bucket.
	const buckets = new Map();
	for (let i = 0; i < total; i++) {
		const o = i * 4;
		const key = ((rgba[o] >> 3) << 10) | ((rgba[o + 1] >> 3) << 5) | (rgba[o + 2] >> 3);
		buckets.set(key, (buckets.get(key) ?? 0) + 1);
	}
	let bestKey = 0;
	let best = -1;
	for (const [key, n] of buckets) {
		if (n > best) {
			best = n;
			bestKey = key;
		}
	}
	const ref = [
		((bestKey >> 10) & 31) * 8 + 4,
		((bestKey >> 5) & 31) * 8 + 4,
		(bestKey & 31) * 8 + 4,
	];
	let content = 0;
	for (let i = 0; i < total; i++) {
		const o = i * 4;
		const d = Math.max(
			Math.abs(rgba[o] - ref[0]),
			Math.abs(rgba[o + 1] - ref[1]),
			Math.abs(rgba[o + 2] - ref[2])
		);
		if (d > CHANNEL_TOLERANCE) content++;
	}
	return content / total < MIN_CONTENT_SHARE;
}
