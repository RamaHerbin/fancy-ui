/**
 * Joins id lists (each possibly space-separated) into one `aria-describedby`
 * value: tokens are split on whitespace, de-duplicated in first-seen order, and
 * the result is `undefined` when nothing is left.
 */
export function mergeIds(...parts: Array<string | null | undefined | false>): string | undefined {
	const seen = new Set<string>();
	for (const part of parts) {
		if (!part) continue;
		for (const token of part.split(/\s+/)) if (token) seen.add(token);
	}
	return seen.size > 0 ? [...seen].join(" ") : undefined;
}
