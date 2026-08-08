// Pure text-matching helpers: the default filter (case- and
// diacritic-insensitive substring match over `label` plus `keywords`) and
// `getMatchRange`, which locates the matched span for highlighting.
//
// The two are independent by construction, the same relationship
// `combobox/match.ts` draws between its own filter and `getMatchRange`:
// highlighting always looks for a literal, folded substring of `label`
// itself, regardless of what logic actually selected the item. A consumer
// `filter` can match on `keywords`, fuzzy logic, anything — when none of
// that produces a literal substring of `label`, there is nothing honest to
// highlight, so the row renders its plain, unhighlighted label instead of a
// span that would misrepresent why it matched.

import type { CommandItem } from "./types.js";

// Built from an escaped-codepoint string rather than a regex literal on
// purpose — a raw combining mark sitting directly in this file's source
// would attach itself to whatever precedes it on screen in most editors and
// terminals, rendering unreadable.
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/** Case- and diacritic-folded form of a string, for matching only — never rendered. */
function fold(text: string): string {
	return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

/** Case- and diacritic-insensitive substring match over `label` plus `keywords`. An empty query matches everything. */
export function defaultFilter(item: CommandItem, query: string): boolean {
	if (!query) return true;
	const needle = fold(query);
	if (fold(item.label).includes(needle)) return true;
	return item.keywords?.some((keyword) => fold(keyword).includes(needle)) ?? false;
}

export interface MatchRange {
	start: number;
	end: number;
}

/**
 * Builds the folded (case/diacritic-stripped) form of `text` alongside a map
 * from each **UTF-16 code unit** of that folded form back to the UTF-16
 * offset it came from in `text`. `map` must be indexed exactly the way
 * `String.prototype.indexOf` counts — one entry per code unit of `folded`,
 * not one per codepoint — because `getMatchRange` below searches with
 * `indexOf` and reads `map` at the index it returns; if the two used
 * different units, every index past a surrogate pair would be off by one.
 *
 * A precomposed accented letter ("é") decomposes under NFD into a base
 * letter plus one or more combining marks; the marks are stripped and
 * contribute no output units, so only the base letter survives — still
 * pointing at the original character's own offset. An astral character
 * (outside the Basic Multilingual Plane — an emoji, say) is different:
 * `fold()` leaves it untouched, but it is still a surrogate pair, two UTF-16
 * code units long, in both `text` and `folded`. Pushing one `map` entry for
 * it (one per *codepoint*, matching the `for...of` iteration below, which
 * always yields one codepoint per pass) would silently under-count by one
 * for every such character — `map.length` would fall behind `folded.length`,
 * and every match found after it would read the wrong entry. The inner loop
 * pushes `outChar.length` entries instead, one per code unit `outChar`
 * actually contributes to `folded`, all pointing at the same source offset.
 *
 * This is what lets a match found in the folded string be translated back
 * to a span of the real, accented label: folding finds the right
 * *characters*, but it can shift *positions* (an NFD decomposition is
 * longer than its precomposed source, before the marks are stripped back
 * off), so a raw folded-string index is not a safe index into the original
 * label on its own — this map is the correction.
 */
function foldWithMap(text: string): { folded: string; map: number[] } {
	let folded = "";
	const map: number[] = [];
	let offset = 0;
	// `for...of` walks by Unicode codepoint, not UTF-16 code unit, so a
	// surrogate pair (an astral character) is one iteration, not two —
	// `char.length` below is then 1 or 2 accordingly, which is what keeps
	// `offset` a valid UTF-16 index into `text` for slicing later.
	for (const char of text) {
		const strippedChar = fold(char);
		for (const outChar of strippedChar) {
			folded += outChar;
			for (let i = 0; i < outChar.length; i++) {
				map.push(offset);
			}
		}
		offset += char.length;
	}
	return { folded, map };
}

/**
 * Finds the first case- and diacritic-insensitive occurrence of `query`
 * inside `label`, returning the span **in `label`'s own original
 * characters** — not in the folded form used to search.
 *
 * Returns `null` when `query` is empty or not literally present in the
 * folded label — including when a custom `filter` matched the item for a
 * reason unrelated to a literal substring of `label` (a keyword, a fuzzy
 * match). Callers render the label plain in that case rather than
 * fabricating a highlighted span the match had nothing to do with.
 */
export function getMatchRange(label: string, query: string): MatchRange | null {
	if (!query) return null;
	const foldedQuery = fold(query);
	if (!foldedQuery) return null;

	const { folded, map } = foldWithMap(label);
	const index = folded.indexOf(foldedQuery);
	if (index === -1) return null;

	const start = map[index];
	// `map[index]` types as `number`, not `number | undefined` — this
	// project's tsconfig has `strict` but not `noUncheckedIndexedAccess`, so
	// the type system does not actually back that up here. Only
	// `foldWithMap`'s own invariant does (one map entry per UTF-16 code unit,
	// matching `folded` exactly), and a future edit to that function could
	// break it silently. Guarded anyway: a range with an `undefined` bound is
	// worse than no highlight — `CommandMenu.svelte`'s
	// `label.slice(range.start, range.end)` would see `slice(undefined, …)`,
	// which JS silently coerces to `slice(0, …)` instead of throwing, and the
	// row would render its entire label twice, once plain and once inside
	// `<mark>`.
	if (start === undefined) return null;
	// The offset one folded-character past the match's own last character —
	// `map[that index]` is where the *next* real character starts, which is
	// exactly the exclusive end this range needs. Past the end of `map`
	// (the match runs to the very end of the folded string) there is no
	// next entry to read, so the end is `label.length` instead.
	const endFoldedIndex = index + foldedQuery.length;
	const end = endFoldedIndex < map.length ? map[endFoldedIndex] : label.length;
	return { start, end };
}
