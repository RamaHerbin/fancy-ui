import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { createRawSnippet, tick } from "svelte";
import Pagination from "./Pagination.svelte";
import Harness from "./PaginationHarness.test.svelte";
import { sound } from "../sound/sound.svelte.js";

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
	// Scoped to the list: the sliding pill is aria-hidden too, but lives outside it.
	return Array.from(container.querySelectorAll('li [aria-hidden="true"]'));
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

describe("Pagination", () => {
	afterEach(cleanup);

	it("renders a nav landmark with the given accessible name", () => {
		const { container } = render(Pagination, {
			props: { count: 12, page: 1, label: "Search results" },
		});
		expect(nav(container).getAttribute("aria-label")).toBe("Search results");
	});

	it("defaults the accessible name to 'Pagination'", () => {
		const { container } = render(Pagination, { props: { count: 12, page: 1 } });
		expect(nav(container).getAttribute("aria-label")).toBe("Pagination");
	});

	it("names each page button for what it does, with the bare number as visible content", () => {
		const { container } = render(Pagination, { props: { count: 3, page: 1 } });
		const two = pageButton(container, 2);

		expect(two.getAttribute("aria-label")).toBe("Go to page 2");
		expect(two.getAttribute("title")).toBe("Go to page 2");
		expect(two.textContent?.trim()).toBe("2");
	});

	it("marks the current page with aria-current and the accent pill class, not colour alone", () => {
		const { container } = render(Pagination, { props: { count: 12, page: 1 } });
		const current = pageButton(container, 1);
		const other = pageButton(container, 2);

		expect(current.getAttribute("aria-current")).toBe("page");
		expect(current.className).toContain("bg-accent");
		expect(other.hasAttribute("aria-current")).toBe(false);
	});

	it("matches the documented mockup sequence: 1, 2, 3, ellipsis, 12 at page 1 of 12", () => {
		const { container } = render(Pagination, { props: { count: 12, page: 1 } });
		expect([1, 2, 3, 12].every((p) => pageButton(container, p))).toBe(true);
		expect(pageButton(container, 4)).toBeUndefined();
		expect(ellipses(container)).toHaveLength(1);
	});

	it("renders the ellipsis as a non-focusable, aria-hidden span rather than a button", () => {
		const { container } = render(Pagination, { props: { count: 12, page: 1 } });
		const [ellipsis] = ellipses(container);

		expect(ellipsis.tagName).toBe("SPAN");
		expect(ellipsis.hasAttribute("tabindex")).toBe(false);
	});

	it("renders two distinct, non-colliding ellipses when the current page sits in the middle", () => {
		const { container } = render(Pagination, { props: { count: 40, page: 20 } });
		// Svelte throws on a duplicate `{#each}` key at this point if the two
		// ellipsis entries aren't keyed apart — reaching this assertion at all
		// is part of what the test is proving, not just the count.
		expect(ellipses(container)).toHaveLength(2);
	});

	it("disables Previous, but not Next, on the first page", () => {
		const { container } = render(Pagination, { props: { count: 12, page: 1 } });
		expect(byLabel(container, "Previous page").disabled).toBe(true);
		expect(byLabel(container, "Next page").disabled).toBe(false);
	});

	it("disables Next, but not Previous, on the last page", () => {
		const { container } = render(Pagination, { props: { count: 12, page: 12 } });
		expect(byLabel(container, "Previous page").disabled).toBe(false);
		expect(byLabel(container, "Next page").disabled).toBe(true);
	});

	it("moves one page forward or back on Next/Previous, and reports it through onPageChange", async () => {
		const onPageChange = vi.fn();
		const { container } = render(Pagination, { props: { count: 12, page: 5, onPageChange } });

		await fireEvent.click(byLabel(container, "Next page"));
		expect(onPageChange).toHaveBeenLastCalledWith(6);

		await fireEvent.click(byLabel(container, "Previous page"));
		expect(onPageChange).toHaveBeenLastCalledWith(5);
	});

	it("jumps straight to a clicked page number", async () => {
		const onPageChange = vi.fn();
		const { container } = render(Pagination, { props: { count: 12, page: 1, onPageChange } });

		await fireEvent.click(pageButton(container, 3));
		expect(onPageChange).toHaveBeenCalledWith(3);
	});

	// jsdom's fireEvent.click does not implement the browser's native
	// pre-click `disabled` short-circuit, so this proves the handler's own
	// boundary re-check — not the disabled attribute — is what actually
	// blocks a synthetic click that walks past it.
	it("blocks Previous from going below page 1 even via a synthetic click", async () => {
		const onPageChange = vi.fn();
		const { container } = render(Pagination, { props: { count: 12, page: 1, onPageChange } });

		await fireEvent.click(byLabel(container, "Previous page"));
		expect(onPageChange).not.toHaveBeenCalled();
	});

	it("blocks Next from going past the last page even via a synthetic click", async () => {
		const onPageChange = vi.fn();
		const { container } = render(Pagination, { props: { count: 12, page: 12, onPageChange } });

		await fireEvent.click(byLabel(container, "Next page"));
		expect(onPageChange).not.toHaveBeenCalled();
	});

	it("disables every control, and blocks clicks, when disabled is set", async () => {
		const onPageChange = vi.fn();
		const { container } = render(Pagination, {
			props: { count: 12, page: 5, disabled: true, onPageChange },
		});

		for (const button of buttons(container)) {
			expect(button.disabled).toBe(true);
		}

		await fireEvent.click(pageButton(container, 6));
		expect(onPageChange).not.toHaveBeenCalled();
	});

	it("hides First/Last by default and shows them when showEdges is set", () => {
		const { container: withoutEdges } = render(Pagination, { props: { count: 12, page: 5 } });
		expect(byLabel(withoutEdges, "First page")).toBeUndefined();
		expect(byLabel(withoutEdges, "Last page")).toBeUndefined();

		const { container: withEdges } = render(Pagination, {
			props: { count: 12, page: 5, showEdges: true },
		});
		expect(byLabel(withEdges, "First page")).toBeTruthy();
		expect(byLabel(withEdges, "Last page")).toBeTruthy();
	});

	it("jumps to page 1 or the last page from the First/Last buttons", async () => {
		const onPageChange = vi.fn();
		const { container } = render(Pagination, {
			props: { count: 12, page: 5, showEdges: true, onPageChange },
		});

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
		const { container } = render(Pagination, {
			props: { count: 20.7, page: 5, showEdges: true, onPageChange },
		});

		await fireEvent.click(byLabel(container, "Last page"));
		expect(onPageChange).toHaveBeenLastCalledWith(20);

		const current = pageButton(container, 20);
		expect(current.getAttribute("aria-current")).toBe("page");

		// The control must still work afterward, not stay wedged.
		await fireEvent.click(byLabel(container, "Previous page"));
		expect(onPageChange).toHaveBeenLastCalledWith(19);
	});

	it("renders custom previousLabel/nextLabel snippet content in place of the defaults", () => {
		const { container } = render(Pagination, {
			props: {
				count: 12,
				page: 5,
				previousLabel: snippet("<span>Back</span>"),
				nextLabel: snippet("<span>Forward</span>"),
			},
		});

		expect(byLabel(container, "Previous page").textContent).toContain("Back");
		expect(byLabel(container, "Next page").textContent).toContain("Forward");
	});

	it("merges the class prop onto the nav element", () => {
		const { container } = render(Pagination, { props: { count: 12, page: 1, class: "mt-4" } });
		const cls = nav(container).className;

		expect(cls).toContain("ft-pagination");
		expect(cls).toContain("mt-4");
	});

	it("round-trips page through bind:page", async () => {
		const { container, getByTestId } = render(Harness, { props: { count: 12, page: 1 } });

		expect(getByTestId("bound-page").textContent).toBe("1");
		await fireEvent.click(pageButton(container, 3));
		expect(getByTestId("bound-page").textContent).toBe("3");
	});

	it("round-trips the nav element through bind:ref", () => {
		const { container } = render(Harness, { props: { count: 12, page: 1 } });
		expect(nav(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	// The current-page pill slides when the page changes. Sliding on first
	// paint would fly it in from the origin,
	// for whichever page happened to already be current, which reads as a glitch
	// on load — so the animation is armed only once the page has really moved.
	// `data-armed` is the switch, and it is the one part of this that jsdom can
	// see.
	it("renders the sliding pill outside the list, hidden from assistive tech", () => {
		const { container } = render(Pagination, { props: { count: 5, page: 2 } });
		const pill = nav(container).querySelector(".ft-pagination-indicator");
		expect(pill).toBeInTheDocument();
		expect(pill).toHaveAttribute("aria-hidden", "true");
		expect(pill?.closest("ul")).toBeNull();
	});

	it("keeps the current page's own fill while the pill cannot be measured (jsdom, JS-off layouts)", async () => {
		const { container } = render(Pagination, { props: { count: 5, page: 2 } });
		await tick();
		await tick();
		// jsdom lays nothing out: offsetWidth is 0, so the pill never takes over.
		expect(nav(container).hasAttribute("data-indicator")).toBe(false);
		expect(pageButton(container, 2).className).toContain("bg-accent");
	});

	it("places the pill on the current page once measured, and follows the page", async () => {
		const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
		const width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
		const left = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetLeft");
		Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
			configurable: true,
			get: () => 32,
		});
		Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
			configurable: true,
			get(this: HTMLElement) {
				// 40px per page: page n sits at (n - 1) * 40.
				const n = Number(this.textContent?.trim());
				return Number.isFinite(n) ? (n - 1) * 40 : 0;
			},
		});
		try {
			const { container } = render(Pagination, { props: { count: 5, page: 2 } });
			await tick();
			await tick();
			const pill = nav(container).querySelector<HTMLElement>(".ft-pagination-indicator")!;
			expect(nav(container).hasAttribute("data-indicator")).toBe(true);
			expect(pill.style.transform).toBe("translate(40px, 0px)");
			expect(pill.style.width).toBe("32px");

			await fireEvent.click(pageButton(container, 4));
			await tick();
			await tick();
			expect(pill.style.transform).toBe("translate(120px, 0px)");
		} finally {
			if (width) Object.defineProperty(HTMLElement.prototype, "offsetWidth", width);
			else delete proto.offsetWidth;
			if (left) Object.defineProperty(HTMLElement.prototype, "offsetLeft", left);
			else delete proto.offsetLeft;
		}
	});

	it("does not arm the active-page slide on first render", () => {
		const { container } = render(Pagination, { props: { count: 12, page: 4 } });
		expect(nav(container).hasAttribute("data-armed")).toBe(false);
	});

	it("arms the active-page slide once the page has actually changed", async () => {
		const { container } = render(Pagination, { props: { count: 12, page: 1 } });
		expect(nav(container).hasAttribute("data-armed")).toBe(false);

		await fireEvent.click(pageButton(container, 3));
		expect(nav(container).getAttribute("data-armed")).toBe("true");
	});

	it("arms the slide for a controlled page change too, not just a click", async () => {
		// A controlled `Pagination` whose `page` prop moves from outside never
		// calls `goTo`, which is exactly why the flag is armed off the derived
		// page rather than from inside the click handler.
		const { container, rerender } = render(Pagination, { props: { count: 12, page: 1 } });
		expect(nav(container).hasAttribute("data-armed")).toBe(false);

		await rerender({ count: 12, page: 6 });
		await waitFor(() => expect(nav(container).getAttribute("data-armed")).toBe("true"));
	});

	it("reduced motion: the page still changes, the pill simply does not slide", async () => {
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
			const { container } = render(Pagination, { props: { count: 12, page: 1 } });

			await fireEvent.click(pageButton(container, 3));
			expect(pageButton(container, 3).getAttribute("aria-current")).toBe("page");
			expect(nav(container).getAttribute("data-armed")).toBe("true");
		} finally {
			window.matchMedia = real;
		}
	});

	it("works uncontrolled, with neither page nor onPageChange passed in", async () => {
		const { container } = render(Pagination, { props: { count: 5 } });
		expect(pageButton(container, 1).getAttribute("aria-current")).toBe("page");

		await fireEvent.click(pageButton(container, 3));
		expect(pageButton(container, 3).getAttribute("aria-current")).toBe("page");
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays the select cue exactly once when sound is enabled and the page actually changes", async () => {
			const { container } = render(Pagination, { props: { count: 12, page: 1, sound: true } });

			await fireEvent.click(pageButton(container, 3));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { container } = render(Pagination, { props: { count: 12, page: 1 } });

			await fireEvent.click(pageButton(container, 3));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const { container } = render(Pagination, {
				props: { count: 12, page: 5, disabled: true, sound: true },
			});
			const next = byLabel(container, "Next page");

			// jsdom does not synthesize a click from a real gesture on a native
			// `disabled` button; a synthetic dispatch bypasses that and reaches
			// `goTo`'s own `if (disabled) return` guard instead.
			next.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when the click lands on the already-current page — the changed-only guard", async () => {
			const { container } = render(Pagination, { props: { count: 12, page: 5, sound: true } });

			await fireEvent.click(pageButton(container, 5));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing for a synthetic click at either boundary, alongside the boundary guard it rides with", async () => {
			const { container } = render(Pagination, { props: { count: 12, page: 1, sound: true } });

			await fireEvent.click(byLabel(container, "Previous page"));

			expect(play).not.toHaveBeenCalled();
		});
	});
});
