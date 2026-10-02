// Pure page-range math for Pagination — no DOM, no framework, trivially
// unit-testable and safe to call during SSR.
//
// The visible pages are the union of three windows: `boundaryCount` pages
// pinned at each end of the run, and a `2 * siblingCount + 1`-wide window
// centred on `page`. That sibling window has a *fixed* width: near an edge
// it is shifted (not truncated) to stay inside `[1, count]`, which is what
// pulls extra numbers into view next to page 1 instead of shrinking the
// control — the same reason the sequence for `page=1, count=12,
// siblingCount=1, boundaryCount=1` is `[1, 2, 3, "ellipsis", 12]` rather
// than the narrower `[1, 2, "ellipsis", 12]`. Once the window has room to
// sit fully away from both edges (the "middle" of the range), its width
// stops changing, so the sequence's length stops changing too.
//
// Any run of hidden pages between two visible ones collapses to a single
// "ellipsis" entry, *except* a run of exactly one page — that page is shown
// instead, since a single-page ellipsis costs the same width as the digit
// it would have hidden.

export type PageItem = number | "ellipsis";

/**
 * Builds the visible page sequence for a pagination control, with
 * `"ellipsis"` markers standing in for runs of two or more hidden pages.
 *
 * @param page - The current page (1-based). Clamped into `[1, count]`.
 * @param count - Total number of pages. `count <= 0` returns `[]`.
 * @param siblingCount - Pages shown on each side of `page`.
 * @param boundaryCount - Pages always shown at each end of the run.
 */
export function buildPageRange(
	page: number,
	count: number,
	siblingCount: number,
	boundaryCount: number
): PageItem[] {
	// Floored, not just clamped: `visible` is keyed by integer page numbers,
	// and the final walk below steps through integers only. A fractional
	// `count` (a consumer computing `totalItems / pageSize` instead of
	// `Math.ceil(...)`, say) or a fractional `page` would seed `visible` with
	// a key the walk can never match, silently dropping real pages instead of
	// erroring — flooring here is what keeps every input an integer before
	// any of that arithmetic runs.
	const safeCount = Math.floor(count);
	if (safeCount <= 0) return [];

	const safeSiblingCount = Math.max(0, Math.floor(siblingCount));
	const safeBoundaryCount = Math.max(0, Math.floor(boundaryCount));
	const current = Math.min(Math.max(Math.floor(page), 1), safeCount);

	// Pages that must always render, collected once as a Set — order doesn't
	// matter here, only membership; the final walk below puts them back in
	// ascending order and fills the gaps.
	const visible = new Set<number>();

	for (let p = 1; p <= Math.min(safeBoundaryCount, safeCount); p++) visible.add(p);
	for (let p = Math.max(1, safeCount - safeBoundaryCount + 1); p <= safeCount; p++) visible.add(p);

	const windowWidth = Math.min(safeSiblingCount * 2 + 1, safeCount);
	let windowStart = current - safeSiblingCount;
	if (windowStart < 1) windowStart = 1;
	if (windowStart + windowWidth - 1 > safeCount) windowStart = safeCount - windowWidth + 1;
	const windowEnd = windowStart + windowWidth - 1;
	for (let p = windowStart; p <= windowEnd; p++) visible.add(p);

	const items: PageItem[] = [];
	let p = 1;
	while (p <= safeCount) {
		if (visible.has(p)) {
			items.push(p);
			p++;
			continue;
		}

		let runEnd = p;
		while (runEnd + 1 <= safeCount && !visible.has(runEnd + 1)) runEnd++;
		const runLength = runEnd - p + 1;

		// A single hidden page is cheaper to just show than to elide — the
		// ellipsis would take the same one slot of width anyway.
		items.push(runLength === 1 ? p : "ellipsis");
		p = runEnd + 1;
	}

	return items;
}
