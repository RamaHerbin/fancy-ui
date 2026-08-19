import { describe, it, expect } from "vitest";
import { buildPageRange, type PageItem } from "./pagination-range";

describe("buildPageRange", () => {
	it("returns an empty array for zero pages", () => {
		expect(buildPageRange(1, 0, 1, 1)).toEqual([]);
	});

	it("returns an empty array for a negative page count, without throwing", () => {
		expect(buildPageRange(1, -3, 1, 1)).toEqual([]);
	});

	it("returns a single page for a one-page run, with no ellipsis", () => {
		expect(buildPageRange(1, 1, 1, 1)).toEqual([1]);
		expect(buildPageRange(5, 1, 1, 1)).toEqual([1]); // page out of range, still just [1]
	});

	it("clamps a page below 1 to the first page's sequence", () => {
		expect(buildPageRange(0, 12, 1, 1)).toEqual(buildPageRange(1, 12, 1, 1));
		expect(buildPageRange(-5, 12, 1, 1)).toEqual(buildPageRange(1, 12, 1, 1));
	});

	it("clamps a page beyond count to the last page's sequence", () => {
		expect(buildPageRange(999, 12, 1, 1)).toEqual(buildPageRange(12, 12, 1, 1));
	});

	it("matches the mockup sequence at the first page: [1, 2, 3, ellipsis, 12]", () => {
		expect(buildPageRange(1, 12, 1, 1)).toEqual([1, 2, 3, "ellipsis", 12]);
	});

	it("mirrors that same sequence at the last page", () => {
		expect(buildPageRange(12, 12, 1, 1)).toEqual([1, "ellipsis", 10, 11, 12]);
	});

	it("shows both ellipses when the current page sits away from both edges", () => {
		expect(buildPageRange(10, 20, 1, 1)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]);
	});

	it("never emits an ellipsis standing in for a single hidden page", () => {
		// count=7, siblingCount=1, boundaryCount=1, page=4: the boundary {1, 7}
		// and the sibling window {3, 4, 5} leave exactly one hidden page on
		// each side (2 and 6) — both must render as numbers, not "...".
		expect(buildPageRange(4, 7, 1, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it("holds a stable output length as the page moves through the middle of a long run", () => {
		// count=30, siblingCount=1, boundaryCount=1: both gaps stay >= 2 pages
		// wide for every page from 4 through 27, so the sequence never grows
		// or shrinks in that whole span.
		const lengths = new Set<number>();
		for (let page = 4; page <= 27; page++) {
			lengths.add(buildPageRange(page, 30, 1, 1).length);
		}
		expect(lengths.size).toBe(1);
		expect([...lengths][0]).toBe(7);
	});

	it("grows the sequence by at most one slot per single-page step from the start into the middle", () => {
		// The control legitimately renders fewer slots right at page 1 (one
		// ellipsis instead of two) than it does once both ellipses have
		// formed in the middle of the range — the "no jumping" guarantee is
		// that it grows there gradually, never in a sudden multi-slot leap.
		const lengths = Array.from({ length: 15 }, (_, i) => buildPageRange(i + 1, 30, 1, 1).length);
		for (let i = 1; i < lengths.length; i++) {
			expect(lengths[i] - lengths[i - 1]).toBeLessThanOrEqual(1);
			expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
		}
		expect(lengths[0]).toBe(5); // [1, 2, 3, ellipsis, 30]
		expect(lengths[lengths.length - 1]).toBe(7); // steady state reached
	});

	it("supports siblingCount 0 — only the current page plus both boundaries", () => {
		expect(buildPageRange(5, 10, 0, 1)).toEqual([1, "ellipsis", 5, "ellipsis", 10]);
	});

	it("supports boundaryCount 0 — no pages pinned at either end", () => {
		expect(buildPageRange(5, 10, 1, 0)).toEqual(["ellipsis", 4, 5, 6, "ellipsis"]);
	});

	it("shows the entire run with no ellipsis once siblingCount covers it all", () => {
		expect(buildPageRange(3, 5, 5, 1)).toEqual([1, 2, 3, 4, 5]);
	});

	it("clamps an oversized boundaryCount to the page count without crashing or duplicating", () => {
		expect(buildPageRange(3, 5, 0, 10)).toEqual([1, 2, 3, 4, 5]);
	});

	it("treats negative sibling/boundary counts as zero instead of throwing", () => {
		expect(buildPageRange(5, 10, -2, -1)).toEqual(["ellipsis", 5, "ellipsis"]);
	});

	it('produces only page numbers or the literal string "ellipsis"', () => {
		const items: PageItem[] = buildPageRange(6, 40, 2, 2);
		for (const item of items) {
			expect(item === "ellipsis" || Number.isInteger(item)).toBe(true);
		}
	});

	// A consumer computing `count` as `totalItems / pageSize` instead of
	// `Math.ceil(...)` hits this on the very first non-exact multiple —
	// this isn't an exotic input, it's an easy off-by-a-fraction mistake.
	// Each case floors its fractional argument and must equal the same call
	// with that argument already an integer; a version that clamps without
	// flooring seeds `visible` with a key the integer walk can never match,
	// silently dropping real pages instead of erroring.
	describe("fractional inputs", () => {
		it("floors a fractional boundaryCount", () => {
			expect(buildPageRange(5, 10, 1, 1.9)).toEqual(buildPageRange(5, 10, 1, 1));
		});

		it("floors a fractional siblingCount", () => {
			expect(buildPageRange(5, 10, 2.9, 1)).toEqual(buildPageRange(5, 10, 2, 1));
		});

		it("floors a fractional page", () => {
			expect(buildPageRange(2.5, 10, 1, 1)).toEqual(buildPageRange(2, 10, 1, 1));
		});

		it("floors a fractional count", () => {
			expect(buildPageRange(1, 12.9, 1, 1)).toEqual(buildPageRange(1, 12, 1, 1));
		});

		it("never drops the real last page when count is fractional", () => {
			// The exact case from the field: count computed as totalItems /
			// pageSize without Math.ceil. Page 10 (floor(10.4)) must still be
			// the sequence's real last entry, not silently missing.
			const items = buildPageRange(5, 10.4, 1, 1);
			expect(items).toContain(10);
			expect(items[items.length - 1]).toBe(10);
		});

		it("does not collapse the sibling window when page and count are both fractional", () => {
			// Regression for the reachable Pagination.svelte path: clicking
			// "Last" on a fractional count used to set `page` to that same
			// fractional value, and buildPageRange(20.7, 20.7, 1, 1) collapsed
			// to [1, "ellipsis"] instead of showing the real last page.
			expect(buildPageRange(20.7, 20.7, 1, 1)).toEqual(buildPageRange(20, 20, 1, 1));
			expect(buildPageRange(20.7, 20.7, 1, 1)).toEqual([1, "ellipsis", 18, 19, 20]);
		});
	});
});
