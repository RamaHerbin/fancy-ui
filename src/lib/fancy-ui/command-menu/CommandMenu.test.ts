import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import CommandMenu from "./CommandMenu.svelte";
import type { CommandItem } from "./types.js";

const ITEMS: CommandItem[] = [
	{ id: "btn", label: "Button", group: "Core", meta: "Actions" },
	{ id: "icon-btn", label: "Icon Button", group: "Core", meta: "Actions" },
	{ id: "rainbow", label: "Rainbow Button", group: "Fancy", meta: "Buttons" },
	{ id: "settings", label: "Settings" },
];

const ITEMS_WITH_DISABLED: CommandItem[] = [
	{ id: "a", label: "Alpha" },
	{ id: "b", label: "Bravo", disabled: true },
	{ id: "c", label: "Charlie" },
];

function panel(): HTMLElement | null {
	// Portalled to document.body, never inside the render container.
	return document.body.querySelector('[role="dialog"]');
}

function input(): HTMLInputElement | null {
	return document.body.querySelector('input[role="combobox"]');
}

function list(): HTMLElement | null {
	return document.body.querySelector('[role="listbox"]');
}

function rows(): HTMLElement[] {
	return Array.from(document.body.querySelectorAll('[role="listbox"] [role="option"]'));
}

function scrim(): HTMLElement | null {
	return document.body.querySelector(".ft-command-menu-scrim");
}

function liveRegion(): HTMLElement | null {
	return panel()?.querySelector('[role="status"]') ?? null;
}

function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

function pointerDownOn(target: HTMLElement) {
	target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

describe("CommandMenu", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("renders nothing when closed", () => {
		render(CommandMenu, { props: { items: ITEMS } });
		expect(panel()).toBeNull();
	});

	it("renders role=dialog with aria-modal and the default accessible name when open", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		const el = panel();
		expect(el).toBeTruthy();
		expect(el?.getAttribute("aria-modal")).toBe("true");
		expect(el?.getAttribute("aria-label")).toBe("Command menu");
	});

	it("honours a custom label as the accessible name of both the dialog and the input", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true, label: "Search everything" } });
		await tick();

		expect(panel()?.getAttribute("aria-label")).toBe("Search everything");
		expect(input()?.getAttribute("aria-label")).toBe("Search everything");
	});

	it("portals the panel to document.body, outside the render container", async () => {
		const { container } = render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		expect(container.querySelector('[role="dialog"]')).toBeNull();
		expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
	});

	it("moves focus into the input on open", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		expect(document.activeElement).toBe(input());
	});

	it("locks the page scroll while open and releases it on close", async () => {
		const { rerender } = render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();
		expect(document.body.style.position).toBe("fixed");

		await rerender({ items: ITEMS, open: false });
		await tick();
		expect(document.body.style.position).toBe("");
	});

	it("returns focus to whatever was focused before opening, once it closes", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		outside.focus();
		expect(document.activeElement).toBe(outside);

		const onOpenChange = vi.fn();
		render(CommandMenu, { props: { items: ITEMS, open: true, onOpenChange } });
		await tick();
		expect(document.activeElement).toBe(input());

		pressEscape();
		await tick();

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(document.activeElement).toBe(outside);
	});

	it("closes on Escape", async () => {
		const onOpenChange = vi.fn();
		render(CommandMenu, { props: { items: ITEMS, open: true, onOpenChange } });
		await tick();

		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("closes on an outside click", async () => {
		const onOpenChange = vi.fn();
		render(CommandMenu, { props: { items: ITEMS, open: true, onOpenChange } });
		await tick();

		pointerDownOn(scrim()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("gives the input role=combobox, aria-expanded=true, and aria-controls pointing at the real list id", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		const el = input()!;
		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("true");
		const controls = el.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(list()?.id).toBe(controls);
	});

	it("renders the list as role=listbox", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();
		expect(list()?.getAttribute("role")).toBe("listbox");
	});

	it("activates the first row by default and points aria-activedescendant at it", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		const el = input()!;
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0].id));
	});

	it("moves the active option with arrow keys while focus stays on the input", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		const el = input()!;
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0].id));

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(rows()[1].id);
		expect(document.activeElement).toBe(el);

		await fireEvent.keyDown(el, { key: "ArrowUp" });
		expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0].id);
		expect(document.activeElement).toBe(el);
	});

	it("Home and End jump to the first and last row", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		const el = input()!;
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0].id));

		await fireEvent.keyDown(el, { key: "End" });
		expect(el.getAttribute("aria-activedescendant")).toBe(rows()[rows().length - 1].id);

		await fireEvent.keyDown(el, { key: "Home" });
		expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0].id);
	});

	it("skips a disabled row as a block during arrow navigation", async () => {
		render(CommandMenu, { props: { items: ITEMS_WITH_DISABLED, open: true } });
		await tick();

		const el = input()!;
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0].id));

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		const activeId = el.getAttribute("aria-activedescendant");
		expect(document.getElementById(activeId!)?.textContent).toContain("Charlie");
	});

	it("keeps every row out of the tab order", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		for (const row of rows()) {
			expect(row.getAttribute("tabindex")).toBe("-1");
		}
	});

	it("guards the scrollIntoView call — jsdom does not implement it, so arrowing through the list must not throw", async () => {
		// `Element.prototype.scrollIntoView` is genuinely undefined under
		// jsdom (confirmed against this repo's `test-setup.ts`, which mocks
		// ResizeObserver/IntersectionObserver/matchMedia but not this) — this
		// is exactly the gap `handleActiveChange`'s
		// `row?.scrollIntoView?.(...)` guards against. No mock is installed
		// here on purpose: the point is that navigating does not throw
		// against jsdom's real, unmodified `Element.prototype`.
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		const el = input()!;
		expect(() => fireEvent.keyDown(el, { key: "ArrowDown" })).not.toThrow();
	});

	it("highlights the matched range as a real <mark> element, never via {@html}", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true, query: "But" } });
		await tick();

		const row = rows().find(
			(r) => r.textContent?.includes("Button") && !r.textContent.includes("Icon")
		)!;
		const mark = row.querySelector("mark");
		expect(mark?.textContent).toBe("But");
		expect(row.textContent).toContain("Button");
	});

	it("filters case-insensitively by default", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		await fireEvent.input(input()!, { target: { value: "RAINBOW" } });
		expect(rows()).toHaveLength(1);
		expect(rows()[0].textContent).toContain("Rainbow Button");
	});

	it("filters diacritic-insensitively and still highlights the real accented characters", async () => {
		const items: CommandItem[] = [{ id: "cafe", label: "Café Society" }];
		render(CommandMenu, { props: { items, open: true } });
		await tick();

		// No accent typed — a naive `label.toLowerCase().indexOf(query)`
		// would find nothing at all, since "é" !== "e".
		await fireEvent.input(input()!, { target: { value: "cafe" } });
		expect(rows()).toHaveLength(1);

		const mark = rows()[0].querySelector("mark");
		expect(mark?.textContent).toBe("Café");
		expect(rows()[0].textContent).toContain("Café Society");
	});

	it("locates the match at the correct offset in the original label even when diacritic-stripping shifts positions", async () => {
		const items: CommandItem[] = [{ id: "cafe", label: "Café Society" }];
		render(CommandMenu, { props: { items, open: true } });
		await tick();

		await fireEvent.input(input()!, { target: { value: "afe soc" } });
		const mark = rows()[0]?.querySelector("mark");
		expect(mark?.textContent).toBe("afé Soc");
	});

	// Regression coverage for an astral-character (outside the Basic
	// Multilingual Plane — a surrogate pair, two UTF-16 code units for one
	// codepoint) bug in `match.ts`'s offset map: `folded.indexOf(...)` counts
	// UTF-16 code units, and the map used to count codepoints instead, so
	// every offset after an astral character was wrong by one per such
	// character — enough of them ran the lookup past the end of the map
	// entirely, and `label.slice(undefined, ...)` silently coerces to
	// `slice(0, ...)`, duplicating the *entire* label once plain and once
	// inside `<mark>`. Each test below asserts the row's full text is still
	// exactly the original label (rules out duplication) alongside the
	// correct highlighted span (rules out an off-by-one).
	describe("astral characters", () => {
		it("does not shift the match when one astral character precedes it", async () => {
			const items: CommandItem[] = [{ id: "a", label: "\u{1f600} smile face" }];
			render(CommandMenu, { props: { items, open: true } });
			await tick();

			await fireEvent.input(input()!, { target: { value: "face" } });
			const row = rows()[0];
			expect(row.querySelector("mark")?.textContent).toBe("face");
			expect(row.textContent?.trim()).toBe(items[0].label);
		});

		it("does not shift the match when three astral characters precede it", async () => {
			const items: CommandItem[] = [{ id: "a", label: "\u{1f600}\u{1f601}\u{1f602} face" }];
			render(CommandMenu, { props: { items, open: true } });
			await tick();

			await fireEvent.input(input()!, { target: { value: "face" } });
			const row = rows()[0];
			expect(row.querySelector("mark")?.textContent).toBe("face");
			expect(row.textContent?.trim()).toBe(items[0].label);
		});

		it("includes an astral character that is itself part of the match, intact", async () => {
			const items: CommandItem[] = [{ id: "a", label: "a\u{1f600}b test" }];
			render(CommandMenu, { props: { items, open: true } });
			await tick();

			await fireEvent.input(input()!, { target: { value: "a\u{1f600}b" } });
			const row = rows()[0];
			expect(row.querySelector("mark")?.textContent).toBe("a\u{1f600}b");
			expect(row.textContent?.trim()).toBe(items[0].label);
		});

		it("does not disturb the match when an astral character follows it", async () => {
			const items: CommandItem[] = [{ id: "a", label: "face \u{1f600} time" }];
			render(CommandMenu, { props: { items, open: true } });
			await tick();

			await fireEvent.input(input()!, { target: { value: "face" } });
			const row = rows()[0];
			expect(row.querySelector("mark")?.textContent).toBe("face");
			expect(row.textContent?.trim()).toBe(items[0].label);
		});
	});

	it("matches on keywords too, with no highlight since the match is not a literal substring of label", async () => {
		const items: CommandItem[] = [{ id: "btn", label: "Button", keywords: ["cta", "action"] }];
		render(CommandMenu, { props: { items, open: true } });
		await tick();

		await fireEvent.input(input()!, { target: { value: "cta" } });
		expect(rows()).toHaveLength(1);
		expect(rows()[0].textContent).toContain("Button");
		expect(rows()[0].querySelector("mark")).toBeNull();
	});

	it("a custom filter overrides the default entirely, and a non-literal match renders unhighlighted", async () => {
		const items: CommandItem[] = [{ id: "js", label: "JavaScript" }];
		render(CommandMenu, {
			props: {
				items,
				open: true,
				// Matches everything, for a reason unrelated to the query text —
				// "zzz" never appears literally in "JavaScript".
				filter: () => true,
			},
		});
		await tick();

		await fireEvent.input(input()!, { target: { value: "zzz" } });
		expect(rows()).toHaveLength(1);
		expect(rows()[0].querySelector("mark")).toBeNull();
		expect(rows()[0].textContent).toContain("JavaScript");
	});

	it("shows the empty message when nothing matches", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true, emptyMessage: "Nothing found" } });
		await tick();

		await fireEvent.input(input()!, { target: { value: "zzzzz" } });
		expect(rows()).toHaveLength(0);
		expect(list()?.textContent).toContain("Nothing found");
	});

	it("defaults the empty message to 'No results'", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		await fireEvent.input(input()!, { target: { value: "zzzzz" } });
		expect(list()?.textContent).toContain("No results");
	});

	it("renders the empty snippet instead of emptyMessage when given", async () => {
		render(CommandMenu, {
			props: {
				items: ITEMS,
				open: true,
				emptyMessage: "should not show",
				empty: snippet('<p data-testid="custom-empty">Nothing here</p>'),
			},
		});
		await tick();

		await fireEvent.input(input()!, { target: { value: "zzzzz" } });
		expect(document.body.querySelector('[data-testid="custom-empty"]')).toBeTruthy();
		expect(list()?.textContent).not.toContain("should not show");
	});

	it("renders ungrouped items first, then groups in the order they were first seen, with real headings", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		const headings = Array.from(list()!.querySelectorAll(".ft-command-menu-heading")).map(
			(el) => el.textContent
		);
		expect(headings).toEqual(["Core", "Fancy"]);

		const children = Array.from(list()!.children);
		const settingsIndex = children.findIndex((el) => el.textContent?.includes("Settings"));
		const firstHeadingIndex = children.findIndex((el) =>
			el.classList.contains("ft-command-menu-heading")
		);
		expect(settingsIndex).toBeGreaterThanOrEqual(0);
		expect(settingsIndex).toBeLessThan(firstHeadingIndex);
	});

	it("does not render a group heading once every item in that group has been filtered out", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		await fireEvent.input(input()!, { target: { value: "rainbow" } });
		const headings = Array.from(list()!.querySelectorAll(".ft-command-menu-heading")).map(
			(el) => el.textContent
		);
		expect(headings).toEqual(["Fancy"]);
	});

	it("renders meta as secondary text on the row", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		const row = rows().find((r) => r.textContent?.includes("Rainbow"))!;
		expect(row.textContent).toContain("Buttons");
	});

	it("renders the icon snippet for each row, given that row's own item", async () => {
		const icon = createRawSnippet<[CommandItem]>((getItem) => ({
			render: () => `<span data-testid="ico-${getItem().id}"></span>`,
		}));
		render(CommandMenu, { props: { items: ITEMS, open: true, icon } });
		await tick();

		for (const item of ITEMS) {
			const el = document.body.querySelector(`[data-testid="ico-${item.id}"]`);
			expect(el).toBeTruthy();
			expect(el?.closest('[aria-hidden="true"]')).toBeTruthy();
		}
	});

	it("commits the active item on Enter, firing the item's own onSelect before the component's onSelect, and closes", async () => {
		const itemOnSelect = vi.fn();
		const onSelect = vi.fn();
		const onOpenChange = vi.fn();
		const items: CommandItem[] = [
			{ id: "a", label: "Alpha", onSelect: itemOnSelect },
			{ id: "b", label: "Bravo" },
		];
		render(CommandMenu, { props: { items, open: true, onSelect, onOpenChange } });
		await tick();

		const el = input()!;
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0].id));

		await fireEvent.keyDown(el, { key: "Enter" });

		expect(itemOnSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(items[0]);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(itemOnSelect.mock.invocationCallOrder[0]).toBeLessThan(
			onSelect.mock.invocationCallOrder[0]
		);
	});

	it("Enter does nothing when there is no active item", async () => {
		const onSelect = vi.fn();
		render(CommandMenu, { props: { items: ITEMS, open: true, onSelect } });
		await tick();

		await fireEvent.input(input()!, { target: { value: "zzzzz" } });
		await fireEvent.keyDown(input()!, { key: "Enter" });

		expect(onSelect).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();
	});

	it("commits on a row click the same way", async () => {
		const onSelect = vi.fn();
		render(CommandMenu, { props: { items: ITEMS, open: true, onSelect } });
		await tick();

		// Found by its own text, not a positional index — "Icon Button" is
		// `ITEMS[1]`, but `ITEMS`' own array order is not the DOM's: the
		// ungrouped "Settings" renders before either group, so a plain
		// `rows()[1]` would not be this row.
		const row = rows().find((r) => r.textContent?.includes("Icon Button"))!;
		await fireEvent.click(row);
		expect(onSelect).toHaveBeenCalledWith(ITEMS[1]);
	});

	it("a disabled row does not commit on click and stays out of keyboard navigation entirely", async () => {
		const onSelect = vi.fn();
		render(CommandMenu, { props: { items: ITEMS_WITH_DISABLED, open: true, onSelect } });
		await tick();

		const disabledRow = rows().find((r) => r.textContent?.includes("Bravo"))!;
		expect(disabledRow.getAttribute("aria-disabled")).toBe("true");

		await fireEvent.click(disabledRow);
		expect(onSelect).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();
	});

	it("the row's mousedown handler calls preventDefault, so a real browser's focus-follows-mousedown default action never fires", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		rows()[0].dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});

	it("keeps a prefilled query on the very first mount, even already open", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true, query: "rain" } });
		await tick();

		expect(input()!.value).toBe("rain");
		expect(rows()).toHaveLength(1);
		expect(rows()[0].textContent).toContain("Rainbow");
	});

	it("resets the query and active index on every reopen after the first", async () => {
		const { rerender } = render(CommandMenu, { props: { items: ITEMS, open: true } });
		await tick();

		const el = input()!;
		await fireEvent.input(el, { target: { value: "rain" } });
		expect(el.value).toBe("rain");

		await rerender({ items: ITEMS, open: false });
		await tick();

		await rerender({ items: ITEMS, open: true });
		await tick();

		expect(input()!.value).toBe("");
		await waitFor(() => expect(input()!.getAttribute("aria-activedescendant")).toBe(rows()[0].id));
	});

	it("round-trips through bind:open", async () => {
		let open = true;
		render(CommandMenu, {
			props: {
				items: ITEMS,
				get open() {
					return open;
				},
				set open(value: boolean) {
					open = value;
				},
			},
		});
		await tick();
		expect(panel()).toBeTruthy();

		pressEscape();
		await tick();
		expect(open).toBe(false);
	});

	it("round-trips through bind:query", async () => {
		let query = "";
		render(CommandMenu, {
			props: {
				items: ITEMS,
				open: true,
				get query() {
					return query;
				},
				set query(value: string) {
					query = value;
				},
			},
		});
		await tick();

		await fireEvent.input(input()!, { target: { value: "rain" } });
		expect(query).toBe("rain");
	});

	it("works with onQueryChange alone, no bind:query", async () => {
		const onQueryChange = vi.fn();
		render(CommandMenu, { props: { items: ITEMS, open: true, onQueryChange } });
		await tick();

		await fireEvent.input(input()!, { target: { value: "rain" } });
		expect(onQueryChange).toHaveBeenCalledWith("rain");
		expect(input()!.value).toBe("rain");
	});

	it("works with onOpenChange alone, no bind:open", async () => {
		const onOpenChange = vi.fn();
		render(CommandMenu, { props: { items: ITEMS, open: true, onOpenChange } });
		await tick();

		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("merges the class prop onto the panel", async () => {
		render(CommandMenu, { props: { items: ITEMS, open: true, class: "mt-4" } });
		await tick();
		expect(panel()!.className).toContain("mt-4");
	});

	it("binds the panel element via ref", async () => {
		let ref: HTMLDivElement | null = null;
		render(CommandMenu, {
			props: {
				items: ITEMS,
				open: true,
				get ref() {
					return ref;
				},
				set ref(value: HTMLDivElement | null) {
					ref = value;
				},
			},
		});
		await tick();
		expect(ref).toBe(panel());
	});

	describe("debounced result-count announcement", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("does not update the live region until the query settles, then reports the count — not the contents", async () => {
			render(CommandMenu, { props: { items: ITEMS, open: true } });
			await vi.advanceTimersByTimeAsync(0);

			const el = input()!;
			const region = liveRegion()!;
			expect(region.textContent).toBe("");

			await vi.advanceTimersByTimeAsync(300);
			expect(region.textContent).toBe(`${ITEMS.length} results`);

			await fireEvent.input(el, { target: { value: "r" } });
			await vi.advanceTimersByTimeAsync(0);
			await fireEvent.input(el, { target: { value: "ra" } });
			await vi.advanceTimersByTimeAsync(0);
			await fireEvent.input(el, { target: { value: "rai" } });
			await vi.advanceTimersByTimeAsync(0);
			// Nothing has settled yet — still the stale count from before typing.
			expect(region.textContent).toBe(`${ITEMS.length} results`);
			expect(region.textContent).not.toContain("Rainbow");

			await vi.advanceTimersByTimeAsync(299);
			expect(region.textContent).toBe(`${ITEMS.length} results`);

			await vi.advanceTimersByTimeAsync(1);
			expect(region.textContent).toBe("1 result");
		});

		it("announces zero results immediately, without waiting out the debounce — the empty state is already visible, so a stale nonzero count would contradict what's on screen", async () => {
			render(CommandMenu, { props: { items: ITEMS, open: true } });
			await vi.advanceTimersByTimeAsync(300);

			const el = input()!;
			const region = liveRegion()!;
			expect(region.textContent).toBe(`${ITEMS.length} results`);

			// "r" matches one item ("Rainbow Button") — schedules a debounced
			// announcement that has not fired yet, so the region is still
			// reporting the stale count from before this keystroke.
			await fireEvent.input(el, { target: { value: "r" } });
			await vi.advanceTimersByTimeAsync(0);
			expect(region.textContent).toBe(`${ITEMS.length} results`);
			expect(rows()).toHaveLength(1);

			// "rz" matches nothing. The list already shows the empty state —
			// unlike a nonzero count, this is announced without waiting out
			// the debounce, so the live region never contradicts what a
			// sighted user is already looking at.
			await fireEvent.input(el, { target: { value: "rz" } });
			await vi.advanceTimersByTimeAsync(0);
			expect(rows()).toHaveLength(0);
			expect(region.textContent).toBe("0 results");
		});

		it("clears immediately on close, without waiting for the debounce", async () => {
			render(CommandMenu, { props: { items: ITEMS, open: true } });
			await vi.advanceTimersByTimeAsync(300);
			expect(liveRegion()!.textContent).toBe(`${ITEMS.length} results`);

			pressEscape();
			await tick();
			expect(liveRegion()).toBeNull();
		});
	});
});
