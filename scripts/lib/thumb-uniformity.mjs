/**
 * Near-uniform frame detection for gallery thumbnails. A capture whose pixels
 * are (almost) all one colour means the demo did not render, so the capture
 * script fails the slug instead of writing a blank WebP.
 */

/** Largest per-channel distance from the dominant colour still counted as background. */
const CHANNEL_TOLERANCE = 10;
/** Fewer than this share of non-background pixels counts as blank. */
const MIN_CONTENT_SHARE = 0.005;

/**
 * @param {Uint8ClampedArray | Uint8Array} rgba RGBA pixels, row-major
 * @param {number} width
 * @param {number} height
 * @returns {boolean} true when the frame is blank or nearly so
 */
export function isNearUniform(rgba, width, height) {
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
