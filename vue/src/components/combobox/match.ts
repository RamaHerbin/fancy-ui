// Pure text-matching helpers shared by the root and its floating panel.
//
// `defaultFilter` and `getMatchRange` are two independent concerns that
// happen to agree by construction: the default filter is "does the label
// contain the query, case-insensitively", and `getMatchRange` finds exactly
// that same substring. When a caller supplies a custom `filter` prop, the two
// deliberately keep working independently — `getMatchRange` still only ever
// looks for a literal case-insensitive substring, regardless of what logic
// actually selected the option, so the span it reports is always true (a
// real occurrence of the query text in the label) even when it cannot
// explain *why* the custom filter chose this option. No literal substring
// found means no highlight, rather than a naive `label.indexOf(query)` (case
// sensitive, unnormalized) that would either miss a case-insensitive match
// entirely or, worse, highlight a coincidental span a custom filter had
// nothing to do with.

export function defaultFilter(label: string, query: string): boolean {
	return label.toLowerCase().includes(query.toLowerCase());
}

export interface MatchRange {
	start: number;
	end: number;
}

/**
 * Finds the first case-insensitive occurrence of `query` inside `label`.
 *
 * Returns `null` when `query` is empty or not literally present in `label`
 * — including when a custom `filter` matched the option for a reason
 * unrelated to a literal substring (fuzzy matching, matching a different
 * field entirely). Callers render the label plain in that case instead of
 * fabricating a highlighted span.
 */
export function getMatchRange(label: string, query: string): MatchRange | null {
	if (!query) return null;
	const index = label.toLowerCase().indexOf(query.toLowerCase());
	if (index === -1) return null;
	return { start: index, end: index + query.length };
}
