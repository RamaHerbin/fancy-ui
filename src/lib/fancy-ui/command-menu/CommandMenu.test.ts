import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { sound } from "../sound/sound.svelte.js";
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

// The last REAL `element.animate` call made on a given node. Svelte issues two
// per transition: a zero-length dummy that exists only to defer the CSS
// keyframes past the DOM update, then the animation that actually runs. Both
// land on the same element, and the real one is always the later of the two,
// so walking back from the end and matching on the spy's recorded `this` is
// what separates the panel's animation from the scrim's.
function lastAnimateOn(
	// Structural type: the DOM lib in this config strips `animate` from
	// `Element` (jsdom has none; test-setup stubs it), so the spy cannot be
	// named via `vi.spyOn<Element, "animate">`.
	spy: { mock: { calls: unknown[][]; contexts: unknown[] } },
	node: Element
): [Keyframe[], KeyframeAnimationOptions] | undefined {
	for (let i = spy.mock.calls.length - 1; i >= 0; i -= 1) {
		if (spy.mock.contexts[i] === node) {
			return spy.mock.calls[i] as [Keyframe[], KeyframeAnimationOptions];
		}
	}
	return undefined;
}

// Replaces `window.matchMedia` wholesale, the pattern the rest of the repo
// uses. The transition resolves it fresh the instant it starts, so an
// override installed before the menu opens is the one that decides whether
// the motion runs at all — in either direction.
function stubMatchMedia(matches: boolean): void {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
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
		// Stays synchronous: `use:scrollLock` acquires at mount, so the lock is
		// in place by the time the panel is on screen. Wrapping this would
		// silently delete that requirement.
		expect(document.body.style.position).toBe("fixed");

		await rerender({ items: ITEMS, open: false });
		// The release is deliberately NOT synchronous any more: the action's
		// `destroy()` is delayed by the exit transition, which is what keeps
		// the page locked until the scrim has actually finished fading.
		await waitFor(() => expect(document.body.style.position).toBe(""));
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

	// The command menu is a centred, scrim-backed, focus-trapped, scroll-
	// locking surface, so it is on the MODAL rung with `Dialog` — 300 ms in,
	// 200 ms out — rather than on the 150 ms anchored rung the dropdown and
	// context menus use. These pin the rung, the geometry, and what has to be
	// true in the window between the dismiss and the unmount.
	describe("modal-rung motion", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("arrives over 300 ms and leaves over 200 ms, scaling about its own centre", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			// Opened from CLOSED, not mounted already open: a local
			// transition does not play on its block's first render, so a
			// component rendered `open` has no entrance to measure.
			const { rerender } = render(CommandMenu, { props: { items: ITEMS, open: false } });
			await rerender({ items: ITEMS, open: true });
			await tick();

			const el = panel()!;
			const [inFrames, inOptions] = lastAnimateOn(animateSpy, el)!;
			expect(inOptions.duration).toBe(300);
			expect(inFrames[0]).toEqual({ opacity: "0", transform: "scale(0.92)" });
			expect(inFrames.at(-1)).toEqual({ opacity: "1", transform: "scale(1)" });
			// The bug the old keyframes carried: they restated
			// `translateX(-50%)` as a `transform` on a node whose centring
			// comes from Tailwind v4's separate `translate` property, so the
			// two composed and the panel drifted in from half its own width
			// to the left. A `transform` that is scale and nothing else
			// composes after `translate` and leaves the centring alone.
			expect(inFrames.some((frame) => String(frame.transform).includes("translate"))).toBe(false);

			pressEscape();
			await tick();

			const [outFrames, outOptions] = lastAnimateOn(animateSpy, el)!;
			expect(outOptions.duration).toBe(200);
			// Half the depth of the entrance: leaving is a smaller gesture
			// than arriving.
			expect(outFrames.at(-1)).toEqual({ opacity: "0", transform: "scale(0.96)" });
			expect(outFrames.some((frame) => String(frame.transform).includes("translate"))).toBe(false);
		});

		it("fades the scrim on opacity alone, on the panel's own clock", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { rerender } = render(CommandMenu, { props: { items: ITEMS, open: false } });
			await rerender({ items: ITEMS, open: true });
			await tick();

			const [frames, options] = lastAnimateOn(animateSpy, scrim()!)!;
			expect(options.duration).toBe(300);
			// `scale: false` keeps a full-viewport fixed element from
			// acquiring a compositing layer for a transform it never uses.
			expect(frames[0]).toEqual({ opacity: "0" });
			expect(frames.at(-1)).toEqual({ opacity: "1" });
		});

		it("keeps the panel and its scrim mounted, inert and marked closing for the length of the exit", async () => {
			render(CommandMenu, { props: { items: ITEMS, open: true } });
			await tick();
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();
			await tick();

			const closing = panel();
			expect(closing).toBeTruthy();
			expect(scrim()).toBeTruthy();
			// Written imperatively from `onoutrostart`: a reactive
			// `data-state` would never reach the DOM, because Svelte marks
			// the branch inert before it plays the outro.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// Svelte sets this itself on any element carrying a
			// `transition:`, for the whole exit. A closing modal must never
			// be interactive — and this is also what takes the live region
			// below out of the accessibility tree on the way out.
			expect(closing!.inert).toBe(true);

			await waitFor(() => expect(panel()).toBeNull());
			expect(scrim()).toBeNull();
		});

		it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
			const onOpenChange = vi.fn();
			render(CommandMenu, { props: { items: ITEMS, open: true, onOpenChange } });
			await tick();

			pressEscape();
			await tick();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape();
			pressEscape();
			await tick();

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("removes the panel in the same tick again under reduced motion", async () => {
			stubMatchMedia(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			render(CommandMenu, { props: { items: ITEMS, open: true } });
			await tick();
			expect(panel()).not.toBeNull();

			pressEscape();
			await tick();

			// A zero duration makes Svelte call the transition's `on_finish`
			// synchronously and never touch `element.animate()`, so the close
			// is exactly as instant as it was before this surface animated
			// out at all — no `waitFor` needed, and none allowed here. The
			// scroll lock comes back with it, in the same tick.
			expect(panel()).toBeNull();
			expect(scrim()).toBeNull();
			expect(document.body.style.position).toBe("");
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("committing the active item with Enter plays select exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(CommandMenu, { props: { items: ITEMS, open: true, sound: true } });
			await tick();
			const el = input()!;
			await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0].id));

			await fireEvent.keyDown(el, { key: "Enter" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(CommandMenu, { props: { items: ITEMS, open: true } });
			await tick();

			await fireEvent.click(rows()[0]);
			expect(play).not.toHaveBeenCalled();
		});

		// Dispatched synthetically, not through `fireEvent.click` — proves the
		// guard lives in `commitItem`'s own `if (item.disabled) return`, not
		// merely in something a native `disabled` attribute or `fireEvent`'s
		// own event construction happens to skip.
		it("a disabled row plays nothing, even dispatched synthetically", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(CommandMenu, { props: { items: ITEMS_WITH_DISABLED, open: true, sound: true } });
			await tick();

			const disabledRow = rows().find((r) => r.textContent?.includes("Bravo"))!;
			disabledRow.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy();
		});

		// The matrix's own double-fire guard: `commitItem`'s own `setOpen(false)`
		// passes `{ silent: true }`, so a committed row's `select` cue is the
		// only one that plays — closing on top of it never also plays `close`.
		it("a row click commits, closes, and plays select only — never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(CommandMenu, { props: { items: ITEMS, open: true, sound: true } });
			await tick();

			const row = rows().find((r) => r.textContent?.includes("Icon Button"))!;
			await fireEvent.click(row);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("Escape dismisses the menu and plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(CommandMenu, { props: { items: ITEMS, open: true, sound: true } });
			await tick();

			pressEscape();
			await tick();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("an outside click on the scrim dismisses the menu and plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(CommandMenu, { props: { items: ITEMS, open: true, sound: true } });
			await tick();

			pointerDownOn(scrim()!);
			await tick();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		// Select precedent (the matrix's own guardrail): the search field stays
		// silent, and so does arrow-browsing the highlight.
		it("typing in the search field and arrow-browsing the list stay silent", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(CommandMenu, { props: { items: ITEMS, open: true, sound: true } });
			await tick();

			const el = input()!;
			await fireEvent.input(el, { target: { value: "rain" } });
			await fireEvent.keyDown(el, { key: "ArrowDown" });
			await fireEvent.keyDown(el, { key: "ArrowUp" });

			expect(play).not.toHaveBeenCalled();
		});

		it("Enter with no active item plays nothing", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(CommandMenu, { props: { items: ITEMS, open: true, sound: true } });
			await tick();

			await fireEvent.input(input()!, { target: { value: "zzzzz" } });
			await fireEvent.keyDown(input()!, { key: "Enter" });

			expect(play).not.toHaveBeenCalled();
		});
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

		it("clears on close, without waiting for the debounce", async () => {
			render(CommandMenu, { props: { items: ITEMS, open: true } });
			await vi.advanceTimersByTimeAsync(300);
			expect(liveRegion()!.textContent).toBe(`${ITEMS.length} results`);

			pressEscape();
			await tick();
			// The region goes with the panel, and the panel now fades out
			// rather than vanishing — so this waits out the exit instead of
			// asserting in the same tick. It is not a hole in the a11y
			// behaviour: the closing panel is `inert` for that whole window,
			// which takes it and its live region out of the accessibility
			// tree, so the stale count is never announced on the way out.
			// What still matters, and is what this pins, is that nothing
			// re-announces and the region is gone by the time the debounce
			// it would have used could have fired.
			await waitFor(() => expect(liveRegion()).toBeNull());
		});
	});
});
