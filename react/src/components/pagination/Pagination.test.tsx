import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { useEffect, useRef, useState } from "react";
import { Pagination } from "./Pagination.js";
import { buildPageRange } from "./pagination-range.js";
import type { PageItem } from "./pagination-range.js";
import { sound, resetSoundForTests } from "../../sound/sound.js";

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
			expect(lengths[i]! - lengths[i - 1]!).toBeLessThanOrEqual(1);
			expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]!);
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
			// Regression for the reachable Pagination path: clicking "Last" on
			// a fractional count used to set `page` to that same fractional
			// value, and buildPageRange(20.7, 20.7, 1, 1) collapsed to
			// [1, "ellipsis"] instead of showing the real last page.
			expect(buildPageRange(20.7, 20.7, 1, 1)).toEqual(buildPageRange(20, 20, 1, 1));
			expect(buildPageRange(20.7, 20.7, 1, 1)).toEqual([1, "ellipsis", 18, 19, 20]);
		});
	});
});

/**
 * Test-only rig, the counterpart of the Svelte harness. `bind:page` has no
 * React channel — the port's controlled/uncontrolled split stands in for it —
 * so the harness owns the page as plain state, hands it down controlled, and
 * echoes it into the DOM to prove the value travels back out to the consumer
 * rather than merely changing what the control draws. The same goes for the
 * forwarded ref, echoed as a `data-bound-ref` attribute.
 */
interface HarnessProps {
	count: number;
	page?: number;
	onPageChange?: (page: number) => void;
	siblingCount?: number;
	boundaryCount?: number;
	showEdges?: boolean;
	disabled?: boolean;
	label?: string;
}

function Harness({
	count,
	page: initialPage = 1,
	onPageChange,
	siblingCount = 1,
	boundaryCount = 1,
	showEdges = false,
	disabled = false,
	label = "Pagination",
}: HarnessProps) {
	// Seeded from the prop and owned from then on, exactly as the Svelte
	// harness's `$bindable` initial value is.
	const [page, setPage] = useState(initialPage);
	const el = useRef<HTMLElement | null>(null);

	useEffect(() => {
		el.current?.setAttribute("data-bound-ref", "yes");
	});

	return (
		<>
			<Pagination
				ref={el}
				page={page}
				count={count}
				onPageChange={(next) => {
					setPage(next);
					onPageChange?.(next);
				}}
				siblingCount={siblingCount}
				boundaryCount={boundaryCount}
				showEdges={showEdges}
				disabled={disabled}
				label={label}
			/>
			<span data-testid="bound-page">{page}</span>
		</>
	);
}

function nav(container: HTMLElement): HTMLElement {
	return container.querySelector("nav") as HTMLElement;
}

function buttons(container: HTMLElement): HTMLButtonElement[] {
	return Array.from(container.querySelectorAll("button"));
}

function pageButton(container: HTMLElement, page: number): HTMLButtonElement {
	return buttons(container).find(
		(b) => b.getAttribute("aria-label") === `Go to page ${page}`
	) as HTMLButtonElement;
}

function byLabel(container: HTMLElement, label: string): HTMLButtonElement {
	return buttons(container).find(
		(b) => b.getAttribute("aria-label") === label
	) as HTMLButtonElement;
}

function ellipses(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll('[aria-hidden="true"]'));
}

describe("Pagination", () => {
	afterEach(cleanup);

	it("renders a nav landmark with the given accessible name", () => {
		const { container } = render(<Pagination count={12} page={1} label="Search results" />);
		expect(nav(container).getAttribute("aria-label")).toBe("Search results");
	});

	it("defaults the accessible name to 'Pagination'", () => {
		const { container } = render(<Pagination count={12} page={1} />);
		expect(nav(container).getAttribute("aria-label")).toBe("Pagination");
	});

	it("names each page button for what it does, with the bare number as visible content", () => {
		const { container } = render(<Pagination count={3} page={1} />);
		const two = pageButton(container, 2);

		expect(two.getAttribute("aria-label")).toBe("Go to page 2");
		expect(two.getAttribute("title")).toBe("Go to page 2");
		expect(two.textContent?.trim()).toBe("2");
	});

	it("marks the current page with aria-current and the accent pill class, not colour alone", () => {
		const { container } = render(<Pagination count={12} page={1} />);
		const current = pageButton(container, 1);
		const other = pageButton(container, 2);

		expect(current.getAttribute("aria-current")).toBe("page");
		expect(current.className).toContain("bg-accent");
		expect(other.hasAttribute("aria-current")).toBe(false);
	});

	it("matches the documented mockup sequence: 1, 2, 3, ellipsis, 12 at page 1 of 12", () => {
		const { container } = render(<Pagination count={12} page={1} />);
		expect([1, 2, 3, 12].every((p) => pageButton(container, p))).toBe(true);
		expect(pageButton(container, 4)).toBeUndefined();
		expect(ellipses(container)).toHaveLength(1);
	});

	it("renders the ellipsis as a non-focusable, aria-hidden span rather than a button", () => {
		const { container } = render(<Pagination count={12} page={1} />);
		const [ellipsis] = ellipses(container);

		expect(ellipsis!.tagName).toBe("SPAN");
		expect(ellipsis!.hasAttribute("tabindex")).toBe(false);
	});

	it("renders two distinct, non-colliding ellipses when the current page sits in the middle", () => {
		const { container } = render(<Pagination count={40} page={20} />);
		// The two ellipsis entries are keyed apart by list position — React
		// would warn (and mis-reconcile) on a duplicate key here; rendering
		// both is part of what the test is proving, not just the count.
		expect(ellipses(container)).toHaveLength(2);
	});

	it("disables Previous, but not Next, on the first page", () => {
		const { container } = render(<Pagination count={12} page={1} />);
		expect(byLabel(container, "Previous page").disabled).toBe(true);
		expect(byLabel(container, "Next page").disabled).toBe(false);
	});

	it("disables Next, but not Previous, on the last page", () => {
		const { container } = render(<Pagination count={12} page={12} />);
		expect(byLabel(container, "Previous page").disabled).toBe(false);
		expect(byLabel(container, "Next page").disabled).toBe(true);
	});

	it("moves one page forward or back on Next/Previous, and reports it through onPageChange", async () => {
		const onPageChange = vi.fn();
		const { container } = render(<Harness count={12} page={5} onPageChange={onPageChange} />);

		await fireEvent.click(byLabel(container, "Next page"));
		expect(onPageChange).toHaveBeenLastCalledWith(6);

		await fireEvent.click(byLabel(container, "Previous page"));
		expect(onPageChange).toHaveBeenLastCalledWith(5);
	});

	it("jumps straight to a clicked page number", async () => {
		const onPageChange = vi.fn();
		const { container } = render(<Pagination count={12} page={1} onPageChange={onPageChange} />);

		await fireEvent.click(pageButton(container, 3));
		expect(onPageChange).toHaveBeenCalledWith(3);
	});

	// jsdom's fireEvent.click does not implement the browser's native
	// pre-click `disabled` short-circuit, so this proves the handler's own
	// boundary re-check — not the disabled attribute — is what actually
	// blocks a synthetic click that walks past it.
	it("blocks Previous from going below page 1 even via a synthetic click", async () => {
		const onPageChange = vi.fn();
		const { container } = render(<Pagination count={12} page={1} onPageChange={onPageChange} />);

		await fireEvent.click(byLabel(container, "Previous page"));
		expect(onPageChange).not.toHaveBeenCalled();
	});

	it("blocks Next from going past the last page even via a synthetic click", async () => {
		const onPageChange = vi.fn();
		const { container } = render(<Pagination count={12} page={12} onPageChange={onPageChange} />);

		await fireEvent.click(byLabel(container, "Next page"));
		expect(onPageChange).not.toHaveBeenCalled();
	});

	it("disables every control, and blocks clicks, when disabled is set", async () => {
		const onPageChange = vi.fn();
		const { container } = render(
			<Pagination count={12} page={5} disabled onPageChange={onPageChange} />
		);

		for (const button of buttons(container)) {
			expect(button.disabled).toBe(true);
		}

		await fireEvent.click(pageButton(container, 6));
		expect(onPageChange).not.toHaveBeenCalled();
	});

	it("hides First/Last by default and shows them when showEdges is set", () => {
		const { container: withoutEdges } = render(<Pagination count={12} page={5} />);
		expect(byLabel(withoutEdges, "First page")).toBeUndefined();
		expect(byLabel(withoutEdges, "Last page")).toBeUndefined();

		const { container: withEdges } = render(<Pagination count={12} page={5} showEdges />);
		expect(byLabel(withEdges, "First page")).toBeTruthy();
		expect(byLabel(withEdges, "Last page")).toBeTruthy();
	});

	it("jumps to page 1 or the last page from the First/Last buttons", async () => {
		const onPageChange = vi.fn();
		const { container } = render(
			<Harness count={12} page={5} showEdges onPageChange={onPageChange} />
		);

		await fireEvent.click(byLabel(container, "Last page"));
		expect(onPageChange).toHaveBeenLastCalledWith(12);

		await fireEvent.click(byLabel(container, "First page"));
		expect(onPageChange).toHaveBeenLastCalledWith(1);
	});

	// Regression: a consumer computing `count` as `totalItems / pageSize`
	// instead of `Math.ceil(...)` used to hit a permanent, silent corruption
	// here — clicking "Last" called goTo(count) with the fractional count
	// itself, setting `page` to that same fractional value, after which
	// aria-current (`item === page`, both integers vs. a fractional page)
	// never matched again for the rest of the session.
	it("clicking Last with a fractional count lands on the real last page, not a fractional one, and stays clickable afterward", async () => {
		const onPageChange = vi.fn();
		const { container } = render(
			<Harness count={20.7} page={5} showEdges onPageChange={onPageChange} />
		);

		await fireEvent.click(byLabel(container, "Last page"));
		expect(onPageChange).toHaveBeenLastCalledWith(20);

		const current = pageButton(container, 20);
		expect(current.getAttribute("aria-current")).toBe("page");

		// The control must still work afterward, not stay wedged.
		await fireEvent.click(byLabel(container, "Previous page"));
		expect(onPageChange).toHaveBeenLastCalledWith(19);
	});

	it("renders custom previousLabel/nextLabel content in place of the defaults", () => {
		const { container } = render(
			<Pagination
				count={12}
				page={5}
				previousLabel={<span>Back</span>}
				nextLabel={<span>Forward</span>}
			/>
		);

		expect(byLabel(container, "Previous page").textContent).toContain("Back");
		expect(byLabel(container, "Next page").textContent).toContain("Forward");
	});

	it("merges the className prop onto the nav element", () => {
		const { container } = render(<Pagination count={12} page={1} className="mt-4" />);
		const cls = nav(container).className;

		expect(cls).toContain("ft-pagination");
		expect(cls).toContain("mt-4");
	});

	it("round-trips page through the controlled prop and onPageChange", async () => {
		const { container, getByTestId } = render(<Harness count={12} page={1} />);

		expect(getByTestId("bound-page").textContent).toBe("1");
		await fireEvent.click(pageButton(container, 3));
		expect(getByTestId("bound-page").textContent).toBe("3");
	});

	it("round-trips the nav element through the forwarded ref", () => {
		const { container } = render(<Harness count={12} page={1} />);
		expect(nav(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	// The current-page pill pops when the page changes. A bare
	// `[aria-current="page"] { animation: … }` would also fire on first paint,
	// for whichever page happened to already be current, which reads as a glitch
	// on load — so the animation is armed only once the page has really moved.
	// `data-armed` is the switch, and it is the one part of this that jsdom can
	// see.
	it("does not arm the active-page pop on first render", () => {
		const { container } = render(<Pagination count={12} page={4} />);
		expect(nav(container).hasAttribute("data-armed")).toBe(false);
	});

	it("arms the active-page pop once the page has actually changed", async () => {
		const { container } = render(<Harness count={12} page={1} />);
		expect(nav(container).hasAttribute("data-armed")).toBe(false);

		await fireEvent.click(pageButton(container, 3));
		expect(nav(container).getAttribute("data-armed")).toBe("true");
	});

	it("arms the pop for a controlled page change too, not just a click", async () => {
		// A controlled `Pagination` whose `page` prop moves from outside never
		// calls `goTo`, which is exactly why the flag is armed off the derived
		// page rather than from inside the click handler.
		const { container, rerender } = render(<Pagination count={12} page={1} />);
		expect(nav(container).hasAttribute("data-armed")).toBe(false);

		rerender(<Pagination count={12} page={6} />);
		await waitFor(() => expect(nav(container).getAttribute("data-armed")).toBe("true"));
	});

	it("reduced motion: the page still changes, the pill simply does not pop", async () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real(query),
			matches: true,
		})) as typeof window.matchMedia;

		try {
			// The keyframe lives inside `@media (prefers-reduced-motion:
			// no-preference)`, so under this preference `data-armed` is still set
			// and simply drives nothing. That is deliberate: the flag is a plain
			// state fact, not a motion decision, and gating it in JS would make the
			// two branches diverge for no benefit.
			const { container } = render(<Harness count={12} page={1} />);

			await fireEvent.click(pageButton(container, 3));
			expect(pageButton(container, 3).getAttribute("aria-current")).toBe("page");
			expect(nav(container).getAttribute("data-armed")).toBe("true");
		} finally {
			window.matchMedia = real;
		}
	});

	it("works uncontrolled, with neither page nor onPageChange passed in", async () => {
		const { container } = render(<Pagination count={5} />);
		expect(pageButton(container, 1).getAttribute("aria-current")).toBe("page");

		await fireEvent.click(pageButton(container, 3));
		expect(pageButton(container, 3).getAttribute("aria-current")).toBe("page");
	});

	describe("sound", () => {
		beforeEach(() => {
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays the select cue exactly once when sound is enabled and the page actually changes", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Pagination count={12} page={1} sound />);

			await fireEvent.click(pageButton(container, 3));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Pagination count={12} page={1} />);

			await fireEvent.click(pageButton(container, 3));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Pagination count={12} page={5} disabled sound />);
			const next = byLabel(container, "Next page");

			// jsdom does not synthesize a click from a real gesture on a native
			// `disabled` button; a synthetic dispatch bypasses that and reaches
			// `goTo`'s own `if (disabled) return` guard instead.
			next.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when the click lands on the already-current page — the changed-only guard", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Pagination count={12} page={5} sound />);

			await fireEvent.click(pageButton(container, 5));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing for a synthetic click at either boundary, alongside the boundary guard it rides with", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Pagination count={12} page={1} sound />);

			await fireEvent.click(byLabel(container, "Previous page"));

			expect(play).not.toHaveBeenCalled();
		});
	});
});
