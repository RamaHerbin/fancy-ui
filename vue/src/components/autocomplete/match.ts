// Pure text-matching helpers shared by the root and its floating panel.
// Autocomplete has no customizable `filter` prop (unlike Combobox) — every
// suggestion match is this same case-insensitive substring rule, so
// `getMatchRange` never has to degrade for a custom filter's sake here. It
// stays a separate function from the filtering predicate anyway, matching
// Combobox's shape, since a highlight span and a yes/no match are different
// questions even when one rule answers both.

export interface MatchRange {
	start: number;
	end: number;
}

/** Finds the first case-insensitive occurrence of `query` inside `text`. Returns `null` when `query` is empty or not present. */
export function getMatchRange(text: string, query: string): MatchRange | null {
	if (!query) return null;
	const index = text.toLowerCase().indexOf(query.toLowerCase());
	if (index === -1) return null;
	return { start: index, end: index + query.length };
}
