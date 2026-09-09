/**
 * Deterministic "initials" avatar synthesised as an inline SVG data URI. The
 * quote cards and the tooltip row type their avatar as an image `src`, and the
 * quoted sources are files, not people, so a two-letter code stands in for a
 * photo.
 */

/** Stable hue per seed, so the same file always gets the same colour. */
function hue(seed: string): number {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) % 360;
	}
	return hash;
}

export function initialsDataUri(code: string, seed: string): string {
	const h = hue(seed);
	// Encoded rather than base64'd: keeps the markup readable in devtools, and
	// `#` / `%` would otherwise break the data URI.
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img"><rect width="64" height="64" rx="32" fill="hsl(${h}, 55%, 42%)"/><text x="32" y="32" dy=".35em" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="600" fill="#ffffff">${code}</text></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
