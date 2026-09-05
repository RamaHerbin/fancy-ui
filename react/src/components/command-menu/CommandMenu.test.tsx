import { StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { CommandMenu } from "./CommandMenu.js";
import type { CommandItem } from "./types.js";
import { __dismissableLayerCount } from "../../internals/dismissable.js";
import { resetSoundForTests, sound } from "../../sound/sound.js";
import { FakeAnimation } from "../../test-setup.js";

/**
 * jsdom has no `inert` IDL property, so `el.inert = true` would otherwise be a
 * plain expando that reflects to no attribute — a test reading `.inert` back
 * would pass even if the real browser behaviour (an `inert` ATTRIBUTE, which
 * is what `:not([inert])` selectors and assistive tech key on) was never
 * touched. Guarded so it is a no-op the moment jsdom ships the real property.
 */
if (!("inert" in HTMLElement.prototype)) {
	Object.defineProperty(HTMLElement.prototype, "inert", {
		configurable: true,
		get(this: HTMLElement) {
			return this.hasAttribute("inert");
		},
		set(this: HTMLElement, value: boolean) {
			if (value) this.setAttribute("inert", "");
			else this.removeAttribute("inert");
		},
	});
}

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

/**
 * Wrapped in a SYNCHRONOUS `act`: the listener is a native document one, so
 * the state update it schedules has to be flushed for the next assertion to
 * see it — but a synchronous `act` does not drain microtasks, which is what
 * keeps an exit leg in flight across the assertions that need it there.
 */
function pressEscape() {
	act(() => {
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
		);
	});
}

function pointerDownOn(target: HTMLElement) {
	const init = { bubbles: true, cancelable: true };
	// The jsdom version this package pins does not implement `PointerEvent`.
	// A `MouseEvent` of the same type carries everything the handler reads
	// (`type` and `target`), so the assertions are unaffected.
	const event =
		typeof PointerEvent === "undefined"
			? new MouseEvent("pointerdown", init)
			: new PointerEvent("pointerdown", init);
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * Drains an entrance or exit leg to completion. The animation stub finishes on
 * a MICROTASK and the transition sampler chains a dummy into the real
 * animation, so a settled leg is two turns away; an async `act` crosses a
 * macrotask boundary and flushes the React updates the finish schedules.
 *
 * Every test that leaves a leg in flight ends with this, and not merely for
 * tidiness: a leg that settles after the test body has returned updates React
 * state outside `act`, which prints a warning per menu.
 */
const settleLegs = () => act(async () => {});

/**
 * The last animation created on a given node. The sampler issues two per
 * transition: a zero-length dummy that exists only to defer the keyframes past
 * the DOM update, then the animation that actually runs. Both land on the same
 * element and the real one is always the later of the two, so walking back
 * from the end is what separates the panel's animation from the scrim's.
 */
function lastAnimateOn(node: Element): FakeAnimation | undefined {
	for (let i = FakeAnimation.instances.length - 1; i >= 0; i -= 1) {
		const animation = FakeAnimation.instances[i];
		if (animation && animation.target === node) return animation;
	}
	return undefined;
}

function framesOf(animation: FakeAnimation): Keyframe[] {
	return animation.keyframes as Keyframe[];
}

function optionsOf(animation: FakeAnimation): KeyframeAnimationOptions {
	return animation.options as KeyframeAnimationOptions;
}

/**
 * Replaces `window.matchMedia` wholesale, the pattern the rest of the repo
 * uses. The transition resolves it fresh the instant it starts, so an override
 * installed before the menu opens is the one that decides whether the motion
 * runs at all — in either direction.
 */
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
	beforeEach(() => {
		// The scroll lock restores the page offset with `window.scrollTo`, which
		// jsdom does not implement — unmocked it floods the run with "Not
		// implemented" console noise on every release.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	});

	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders nothing when closed", () => {
		render(<CommandMenu items={ITEMS} />);
		expect(panel()).toBeNull();
	});

	it("renders role=dialog with aria-modal and the default accessible name when open", () => {
		render(<CommandMenu items={ITEMS} open />);

		const el = panel();
		expect(el).toBeTruthy();
		expect(el?.getAttribute("aria-modal")).toBe("true");
		expect(el?.getAttribute("aria-label")).toBe("Command menu");
	});

	it("honours a custom label as the accessible name of both the dialog and the input", () => {
		render(<CommandMenu items={ITEMS} open label="Search everything" />);

		expect(panel()?.getAttribute("aria-label")).toBe("Search everything");
		expect(input()?.getAttribute("aria-label")).toBe("Search everything");
	});

	it("portals the panel to document.body, outside the render container", () => {
		const { container } = render(<CommandMenu items={ITEMS} open />);

		expect(container.querySelector('[role="dialog"]')).toBeNull();
		expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
	});

	it("moves focus into the input on open", () => {
		render(<CommandMenu items={ITEMS} open />);

		expect(document.activeElement).toBe(input());
	});

	it("locks the page scroll while open and releases it on close", async () => {
		const { rerender } = render(<CommandMenu items={ITEMS} open />);
		// Stays synchronous: the lock is acquired in a layout effect the moment
		// the surface mounts, so it is in place by the time the panel is on
		// screen. Wrapping this would silently delete that requirement.
		expect(document.body.style.position).toBe("fixed");

		rerender(<CommandMenu items={ITEMS} open={false} />);
		// The release is deliberately NOT synchronous: it is scoped to the
		// surface's MOUNT, which the presence clock holds for the length of the
		// exit, which is what keeps the page locked until the scrim has
		// actually finished fading.
		await waitFor(() => expect(document.body.style.position).toBe(""));
	});

	it("returns focus to whatever was focused before opening, once it closes", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		outside.focus();
		expect(document.activeElement).toBe(outside);

		const onOpenChange = vi.fn();
		render(<CommandMenu items={ITEMS} open onOpenChange={onOpenChange} />);
		expect(document.activeElement).toBe(input());

		pressEscape();

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(document.activeElement).toBe(outside);
		await settleLegs();
	});

	it("closes on Escape", async () => {
		const onOpenChange = vi.fn();
		render(<CommandMenu items={ITEMS} open onOpenChange={onOpenChange} />);

		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("closes on an outside click", async () => {
		const onOpenChange = vi.fn();
		render(<CommandMenu items={ITEMS} open onOpenChange={onOpenChange} />);

		pointerDownOn(scrim()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("gives the input role=combobox, aria-expanded=true, and aria-controls pointing at the real list id", () => {
		render(<CommandMenu items={ITEMS} open />);

		const el = input()!;
		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("true");
		const controls = el.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(list()?.id).toBe(controls);
	});

	it("renders the list as role=listbox", () => {
		render(<CommandMenu items={ITEMS} open />);
		expect(list()?.getAttribute("role")).toBe("listbox");
	});

	it("activates the first row by default and points aria-activedescendant at it", async () => {
		render(<CommandMenu items={ITEMS} open />);

		const el = input()!;
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0]!.id));
	});

	it("moves the active option with arrow keys while focus stays on the input", async () => {
		render(<CommandMenu items={ITEMS} open />);

		const el = input()!;
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0]!.id));

		fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(rows()[1]!.id);
		expect(document.activeElement).toBe(el);

		fireEvent.keyDown(el, { key: "ArrowUp" });
		expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0]!.id);
		expect(document.activeElement).toBe(el);
	});

	it("Home and End jump to the first and last row", async () => {
		render(<CommandMenu items={ITEMS} open />);

		const el = input()!;
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0]!.id));

		fireEvent.keyDown(el, { key: "End" });
		expect(el.getAttribute("aria-activedescendant")).toBe(rows()[rows().length - 1]!.id);

		fireEvent.keyDown(el, { key: "Home" });
		expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0]!.id);
	});

	it("skips a disabled row as a block during arrow navigation", async () => {
		render(<CommandMenu items={ITEMS_WITH_DISABLED} open />);

		const el = input()!;
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0]!.id));

		fireEvent.keyDown(el, { key: "ArrowDown" });
		const activeId = el.getAttribute("aria-activedescendant");
		expect(document.getElementById(activeId!)?.textContent).toContain("Charlie");
	});

	it("keeps every row out of the tab order", () => {
		render(<CommandMenu items={ITEMS} open />);

		for (const row of rows()) {
			expect(row.getAttribute("tabindex")).toBe("-1");
		}
	});

	it("guards the scrollIntoView call — jsdom does not implement it, so arrowing through the list must not throw", () => {
		// `Element.prototype.scrollIntoView` is genuinely undefined under jsdom
		// (confirmed against this package's `test-setup.ts`, which stubs
		// ResizeObserver/IntersectionObserver/matchMedia/animate but not this) —
		// this is exactly the gap `handleActiveChange`'s
		// `row?.scrollIntoView?.(...)` guards against. No mock is installed here
		// on purpose: the point is that navigating does not throw against
		// jsdom's real, unmodified `Element.prototype`.
		render(<CommandMenu items={ITEMS} open />);

		const el = input()!;
		expect(() => fireEvent.keyDown(el, { key: "ArrowDown" })).not.toThrow();
	});

	it("highlights the matched range as a real <mark> element, never via raw HTML", () => {
		render(<CommandMenu items={ITEMS} open query="But" />);

		const row = rows().find(
			(r) => r.textContent?.includes("Button") && !r.textContent.includes("Icon")
		)!;
		const mark = row.querySelector("mark");
		expect(mark?.textContent).toBe("But");
		expect(row.textContent).toContain("Button");
	});

	it("filters case-insensitively by default", () => {
		render(<CommandMenu items={ITEMS} open />);

		fireEvent.change(input()!, { target: { value: "RAINBOW" } });
		expect(rows()).toHaveLength(1);
		expect(rows()[0]!.textContent).toContain("Rainbow Button");
	});

	it("filters diacritic-insensitively and still highlights the real accented characters", () => {
		const items: CommandItem[] = [{ id: "cafe", label: "Café Society" }];
		render(<CommandMenu items={items} open />);

		// No accent typed — a naive `label.toLowerCase().indexOf(query)` would
		// find nothing at all, since "é" !== "e".
		fireEvent.change(input()!, { target: { value: "cafe" } });
		expect(rows()).toHaveLength(1);

		const mark = rows()[0]!.querySelector("mark");
		expect(mark?.textContent).toBe("Café");
		expect(rows()[0]!.textContent).toContain("Café Society");
	});

	it("locates the match at the correct offset in the original label even when diacritic-stripping shifts positions", () => {
		const items: CommandItem[] = [{ id: "cafe", label: "Café Society" }];
		render(<CommandMenu items={items} open />);

		fireEvent.change(input()!, { target: { value: "afe soc" } });
		const mark = rows()[0]?.querySelector("mark");
		expect(mark?.textContent).toBe("afé Soc");
	});

	// Regression coverage for an astral-character (outside the Basic
	// Multilingual Plane — a surrogate pair, two UTF-16 code units for one
	// codepoint) bug in `match.ts`'s offset map: `folded.indexOf(...)` counts
	// UTF-16 code units, and the map used to count codepoints instead, so every
	// offset after an astral character was wrong by one per such character —
	// enough of them ran the lookup past the end of the map entirely, and
	// `label.slice(undefined, ...)` silently coerces to `slice(0, ...)`,
	// duplicating the *entire* label once plain and once inside `<mark>`. Each
	// test below asserts the row's full text is still exactly the original
	// label (rules out duplication) alongside the correct highlighted span
	// (rules out an off-by-one).
	describe("astral characters", () => {
		it("does not shift the match when one astral character precedes it", () => {
			const items: CommandItem[] = [{ id: "a", label: "\u{1f600} smile face" }];
			render(<CommandMenu items={items} open />);

			fireEvent.change(input()!, { target: { value: "face" } });
			const row = rows()[0]!;
			expect(row.querySelector("mark")?.textContent).toBe("face");
			expect(row.textContent?.trim()).toBe(items[0]!.label);
		});

		it("does not shift the match when three astral characters precede it", () => {
			const items: CommandItem[] = [{ id: "a", label: "\u{1f600}\u{1f601}\u{1f602} face" }];
			render(<CommandMenu items={items} open />);

			fireEvent.change(input()!, { target: { value: "face" } });
			const row = rows()[0]!;
			expect(row.querySelector("mark")?.textContent).toBe("face");
			expect(row.textContent?.trim()).toBe(items[0]!.label);
		});

		it("includes an astral character that is itself part of the match, intact", () => {
			const items: CommandItem[] = [{ id: "a", label: "a\u{1f600}b test" }];
			render(<CommandMenu items={items} open />);

			fireEvent.change(input()!, { target: { value: "a\u{1f600}b" } });
			const row = rows()[0]!;
			expect(row.querySelector("mark")?.textContent).toBe("a\u{1f600}b");
			expect(row.textContent?.trim()).toBe(items[0]!.label);
		});

		it("does not disturb the match when an astral character follows it", () => {
			const items: CommandItem[] = [{ id: "a", label: "face \u{1f600} time" }];
			render(<CommandMenu items={items} open />);

			fireEvent.change(input()!, { target: { value: "face" } });
			const row = rows()[0]!;
			expect(row.querySelector("mark")?.textContent).toBe("face");
			expect(row.textContent?.trim()).toBe(items[0]!.label);
		});
	});

	it("matches on keywords too, with no highlight since the match is not a literal substring of label", () => {
		const items: CommandItem[] = [{ id: "btn", label: "Button", keywords: ["cta", "action"] }];
		render(<CommandMenu items={items} open />);

		fireEvent.change(input()!, { target: { value: "cta" } });
		expect(rows()).toHaveLength(1);
		expect(rows()[0]!.textContent).toContain("Button");
		expect(rows()[0]!.querySelector("mark")).toBeNull();
	});

	it("a custom filter overrides the default entirely, and a non-literal match renders unhighlighted", () => {
		const items: CommandItem[] = [{ id: "js", label: "JavaScript" }];
		// Matches everything, for a reason unrelated to the query text — "zzz"
		// never appears literally in "JavaScript".
		render(<CommandMenu items={items} open filter={() => true} />);

		fireEvent.change(input()!, { target: { value: "zzz" } });
		expect(rows()).toHaveLength(1);
		expect(rows()[0]!.querySelector("mark")).toBeNull();
		expect(rows()[0]!.textContent).toContain("JavaScript");
	});

	it("shows the empty message when nothing matches", () => {
		render(<CommandMenu items={ITEMS} open emptyMessage="Nothing found" />);

		fireEvent.change(input()!, { target: { value: "zzzzz" } });
		expect(rows()).toHaveLength(0);
		expect(list()?.textContent).toContain("Nothing found");
	});

	it("defaults the empty message to 'No results'", () => {
		render(<CommandMenu items={ITEMS} open />);

		fireEvent.change(input()!, { target: { value: "zzzzz" } });
		expect(list()?.textContent).toContain("No results");
	});

	it("renders the empty node instead of emptyMessage when given", () => {
		render(
			<CommandMenu
				items={ITEMS}
				open
				emptyMessage="should not show"
				empty={<p data-testid="custom-empty">Nothing here</p>}
			/>
		);

		fireEvent.change(input()!, { target: { value: "zzzzz" } });
		expect(document.body.querySelector('[data-testid="custom-empty"]')).toBeTruthy();
		expect(list()?.textContent).not.toContain("should not show");
	});

	it("renders ungrouped items first, then groups in the order they were first seen, with real headings", () => {
		render(<CommandMenu items={ITEMS} open />);

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

	it("does not render a group heading once every item in that group has been filtered out", () => {
		render(<CommandMenu items={ITEMS} open />);

		fireEvent.change(input()!, { target: { value: "rainbow" } });
		const headings = Array.from(list()!.querySelectorAll(".ft-command-menu-heading")).map(
			(el) => el.textContent
		);
		expect(headings).toEqual(["Fancy"]);
	});

	it("renders meta as secondary text on the row", () => {
		render(<CommandMenu items={ITEMS} open />);

		const row = rows().find((r) => r.textContent?.includes("Rainbow"))!;
		expect(row.textContent).toContain("Buttons");
	});

	it("renders the icon node for each row, given that row's own item", () => {
		render(
			<CommandMenu items={ITEMS} open icon={(item) => <span data-testid={`ico-${item.id}`} />} />
		);

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
		render(<CommandMenu items={items} open onSelect={onSelect} onOpenChange={onOpenChange} />);

		const el = input()!;
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0]!.id));

		fireEvent.keyDown(el, { key: "Enter" });

		expect(itemOnSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(items[0]);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(itemOnSelect.mock.invocationCallOrder[0]!).toBeLessThan(
			onSelect.mock.invocationCallOrder[0]!
		);
		await settleLegs();
	});

	it("Enter does nothing when there is no active item", () => {
		const onSelect = vi.fn();
		render(<CommandMenu items={ITEMS} open onSelect={onSelect} />);

		fireEvent.change(input()!, { target: { value: "zzzzz" } });
		fireEvent.keyDown(input()!, { key: "Enter" });

		expect(onSelect).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();
	});

	it("commits on a row click the same way", async () => {
		const onSelect = vi.fn();
		render(<CommandMenu items={ITEMS} open onSelect={onSelect} />);

		// Found by its own text, not a positional index — "Icon Button" is
		// `ITEMS[1]`, but `ITEMS`' own array order is not the DOM's: the
		// ungrouped "Settings" renders before either group, so a plain
		// `rows()[1]` would not be this row.
		const row = rows().find((r) => r.textContent?.includes("Icon Button"))!;
		fireEvent.click(row);
		expect(onSelect).toHaveBeenCalledWith(ITEMS[1]);
		await settleLegs();
	});

	it("a disabled row does not commit on click and stays out of keyboard navigation entirely", () => {
		const onSelect = vi.fn();
		render(<CommandMenu items={ITEMS_WITH_DISABLED} open onSelect={onSelect} />);

		const disabledRow = rows().find((r) => r.textContent?.includes("Bravo"))!;
		expect(disabledRow.getAttribute("aria-disabled")).toBe("true");

		fireEvent.click(disabledRow);
		expect(onSelect).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();
	});

	it("the row's mousedown handler calls preventDefault, so a real browser's focus-follows-mousedown default action never fires", () => {
		render(<CommandMenu items={ITEMS} open />);

		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		act(() => {
			rows()[0]!.dispatchEvent(event);
		});
		expect(event.defaultPrevented).toBe(true);
	});

	it("keeps a prefilled query on the very first mount, even already open", () => {
		render(<CommandMenu items={ITEMS} open query="rain" />);

		expect(input()!.value).toBe("rain");
		expect(rows()).toHaveLength(1);
		expect(rows()[0]!.textContent).toContain("Rainbow");
	});

	// The same contract under the dev-time double invoke: the reset-on-open
	// effect keys on the open EDGE, so running its body twice for one mount is
	// a no-op the second time. A latch that merely survives the simulated
	// remount would take the reopen branch on the replay, clear the seeded
	// query, and report a value the caller never typed.
	it("keeps a prefilled query on the very first mount under StrictMode, and fires no onQueryChange", () => {
		const onQueryChange = vi.fn();
		render(
			<StrictMode>
				<CommandMenu items={ITEMS} open query="rain" onQueryChange={onQueryChange} />
			</StrictMode>
		);

		expect(input()!.value).toBe("rain");
		expect(rows()).toHaveLength(1);
		expect(rows()[0]!.textContent).toContain("Rainbow");
		expect(onQueryChange).not.toHaveBeenCalled();
	});

	it("resets the query and active index on every reopen after the first", async () => {
		const { rerender } = render(<CommandMenu items={ITEMS} open />);

		const el = input()!;
		fireEvent.change(el, { target: { value: "rain" } });
		expect(el.value).toBe("rain");

		rerender(<CommandMenu items={ITEMS} open={false} />);
		await settleLegs();

		rerender(<CommandMenu items={ITEMS} open />);

		expect(input()!.value).toBe("");
		await waitFor(() => expect(input()!.getAttribute("aria-activedescendant")).toBe(rows()[0]!.id));
		await settleLegs();
	});

	it("round-trips through a controlled open + onOpenChange pair", async () => {
		// The React spelling of the source's `bind:open`: the caller owns the
		// value and writes it back from `onOpenChange`.
		const seen: boolean[] = [];
		function Controlled() {
			const [open, setOpen] = useState(true);
			seen.push(open);
			return <CommandMenu items={ITEMS} open={open} onOpenChange={setOpen} />;
		}
		render(<Controlled />);
		expect(panel()).toBeTruthy();

		pressEscape();
		expect(seen.at(-1)).toBe(false);
		await settleLegs();
	});

	it("round-trips through a controlled query + onQueryChange pair", () => {
		const seen: string[] = [];
		function Controlled() {
			const [query, setQuery] = useState("");
			seen.push(query);
			return <CommandMenu items={ITEMS} open query={query} onQueryChange={setQuery} />;
		}
		render(<Controlled />);

		fireEvent.change(input()!, { target: { value: "rain" } });
		expect(seen.at(-1)).toBe("rain");
	});

	it("works with onQueryChange alone, no controlled value", () => {
		const onQueryChange = vi.fn();
		render(<CommandMenu items={ITEMS} open onQueryChange={onQueryChange} />);

		fireEvent.change(input()!, { target: { value: "rain" } });
		expect(onQueryChange).toHaveBeenCalledWith("rain");
		expect(input()!.value).toBe("rain");
	});

	it("works with onOpenChange alone, no controlled value", async () => {
		const onOpenChange = vi.fn();
		render(<CommandMenu items={ITEMS} open onOpenChange={onOpenChange} />);

		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("merges the class prop onto the panel", () => {
		render(<CommandMenu items={ITEMS} open className="mt-4" />);
		expect(panel()!.className).toContain("mt-4");
	});

	it("exposes the panel element through the forwarded ref", () => {
		const ref = { current: null as HTMLDivElement | null };
		render(<CommandMenu ref={ref} items={ITEMS} open />);
		expect(ref.current).toBe(panel());
	});

	// The command menu is a centred, scrim-backed, focus-trapped, scroll-
	// locking surface, so it is on the MODAL rung with `Dialog` — 300 ms in,
	// 200 ms out — rather than on the 150 ms anchored rung the dropdown and
	// context menus use. These pin the rung, the geometry, and what has to be
	// true in the window between the dismiss and the unmount.
	describe("modal-rung motion", () => {
		it("arrives over 300 ms and leaves over 200 ms, scaling about its own centre", async () => {
			// Opened from CLOSED, not mounted already open: an entrance does not
			// play on the surface's first render, so a component rendered `open`
			// has no entrance to measure.
			const { rerender } = render(<CommandMenu items={ITEMS} open={false} />);
			rerender(<CommandMenu items={ITEMS} open />);
			// The sampler always issues a zero-length dummy first and builds the
			// real animation inside its `onfinish`, one microtask later — so the
			// leg has to be drained before the keyframes it actually runs exist
			// to be read.
			const el = panel()!;
			await settleLegs();

			const entrance = lastAnimateOn(el)!;
			const inFrames = framesOf(entrance);
			expect(optionsOf(entrance).duration).toBe(300);
			expect(inFrames[0]).toEqual({ opacity: "0", transform: "scale(0.92)" });
			expect(inFrames.at(-1)).toEqual({ opacity: "1", transform: "scale(1)" });
			// The bug the old keyframes carried: they restated
			// `translateX(-50%)` as a `transform` on a node whose centring comes
			// from Tailwind v4's separate `translate` property, so the two
			// composed and the panel drifted in from half its own width to the
			// left. A `transform` that is scale and nothing else composes after
			// `translate` and leaves the centring alone.
			expect(inFrames.some((frame) => String(frame.transform).includes("translate"))).toBe(false);

			pressEscape();
			await settleLegs();

			const exit = lastAnimateOn(el)!;
			const outFrames = framesOf(exit);
			expect(optionsOf(exit).duration).toBe(200);
			// Half the depth of the entrance: leaving is a smaller gesture than
			// arriving.
			expect(outFrames.at(-1)).toEqual({ opacity: "0", transform: "scale(0.96)" });
			expect(outFrames.some((frame) => String(frame.transform).includes("translate"))).toBe(false);
			await settleLegs();
		});

		it("fades the scrim on opacity alone, on the panel's own clock", async () => {
			const { rerender } = render(<CommandMenu items={ITEMS} open={false} />);
			rerender(<CommandMenu items={ITEMS} open />);
			const el = scrim()!;
			await settleLegs();

			const entrance = lastAnimateOn(el)!;
			const frames = framesOf(entrance);
			expect(optionsOf(entrance).duration).toBe(300);
			// `scale: false` keeps a full-viewport fixed element from acquiring a
			// compositing layer for a transform it never uses.
			expect(frames[0]).toEqual({ opacity: "0" });
			expect(frames.at(-1)).toEqual({ opacity: "1" });
			await settleLegs();
		});

		it("keeps the panel and its scrim mounted, inert and marked closing for the length of the exit", async () => {
			render(<CommandMenu items={ITEMS} open />);
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();

			const closing = panel();
			expect(closing).toBeTruthy();
			expect(scrim()).toBeTruthy();
			// An ordinary React attribute here, carrying `surfaceState`'s two
			// values.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// Set on every registered node for the whole exit. A closing modal
			// must never be interactive — and this is also what takes the live
			// region out of the accessibility tree on the way out.
			expect(closing!.inert).toBe(true);

			await waitFor(() => expect(panel()).toBeNull());
			expect(scrim()).toBeNull();
		});

		it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
			const onOpenChange = vi.fn();
			render(<CommandMenu items={ITEMS} open onOpenChange={onOpenChange} />);

			pressEscape();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape();
			pressEscape();

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
			await settleLegs();
		});

		it("removes the panel in the same tick again under reduced motion", () => {
			stubMatchMedia(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			render(<CommandMenu items={ITEMS} open />);
			expect(panel()).not.toBeNull();

			pressEscape();

			// A zero duration makes the sampler call its finish callback
			// synchronously and never touch `element.animate()`, so the close is
			// exactly as instant as it was before this surface animated out at
			// all — no `waitFor` needed, and none allowed here. The scroll lock
			// comes back with it, in the same tick.
			expect(panel()).toBeNull();
			expect(scrim()).toBeNull();
			expect(document.body.style.position).toBe("");
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	describe("sound", () => {
		beforeEach(() => {
			// The controller is a module singleton and reads the stored
			// preference lazily, so each case starts from a forgotten engine and
			// an empty store rather than inheriting whatever ran before it.
			resetSoundForTests();
			window.localStorage.clear();
		});

		// No local `afterEach` restoring mocks: the suite's own already does,
		// AFTER `cleanup()`. Restoring here first would take the `window.scrollTo`
		// stub away before the scroll lock releases on unmount, and jsdom does
		// not implement it — the run would fill with "Not implemented" noise.

		it("committing the active item with Enter plays select exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<CommandMenu items={ITEMS} open sound />);
			const el = input()!;
			await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(rows()[0]!.id));

			fireEvent.keyDown(el, { key: "Enter" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
			await settleLegs();
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<CommandMenu items={ITEMS} open />);

			fireEvent.click(rows()[0]!);
			expect(play).not.toHaveBeenCalled();
			await settleLegs();
		});

		// Dispatched synthetically, not through `fireEvent.click` — proves the
		// guard lives in `commitItem`'s own `if (item.disabled) return`, not
		// merely in something a native `disabled` attribute or the event helper's
		// own event construction happens to skip.
		it("a disabled row plays nothing, even dispatched synthetically", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<CommandMenu items={ITEMS_WITH_DISABLED} open sound />);

			const disabledRow = rows().find((r) => r.textContent?.includes("Bravo"))!;
			act(() => {
				disabledRow.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			});

			expect(play).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy();
		});

		// The double-fire guard: `commitItem`'s own `setOpen(false)` passes
		// `{ silent: true }`, so a committed row's `select` cue is the only one
		// that plays — closing on top of it never also plays `close`.
		it("a row click commits, closes, and plays select only — never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<CommandMenu items={ITEMS} open sound />);

			const row = rows().find((r) => r.textContent?.includes("Icon Button"))!;
			fireEvent.click(row);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
			await settleLegs();
		});

		it("Escape dismisses the menu and plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<CommandMenu items={ITEMS} open sound />);

			pressEscape();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
			await settleLegs();
		});

		it("an outside click on the scrim dismisses the menu and plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<CommandMenu items={ITEMS} open sound />);

			pointerDownOn(scrim()!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
			await settleLegs();
		});

		// The search field stays silent, and so does arrow-browsing the
		// highlight.
		it("typing in the search field and arrow-browsing the list stay silent", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<CommandMenu items={ITEMS} open sound />);

			const el = input()!;
			fireEvent.change(el, { target: { value: "rain" } });
			fireEvent.keyDown(el, { key: "ArrowDown" });
			fireEvent.keyDown(el, { key: "ArrowUp" });

			expect(play).not.toHaveBeenCalled();
		});

		it("Enter with no active item plays nothing", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<CommandMenu items={ITEMS} open sound />);

			fireEvent.change(input()!, { target: { value: "zzzzz" } });
			fireEvent.keyDown(input()!, { key: "Enter" });

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

		/** Advances the debounce clock inside `act`, so the state update it
		 *  schedules is flushed before the next assertion reads the DOM. */
		const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

		it("does not update the live region until the query settles, then reports the count — not the contents", async () => {
			render(<CommandMenu items={ITEMS} open />);
			await advance(0);

			const el = input()!;
			const region = liveRegion()!;
			expect(region.textContent).toBe("");

			await advance(300);
			expect(region.textContent).toBe(`${ITEMS.length} results`);

			fireEvent.change(el, { target: { value: "r" } });
			await advance(0);
			fireEvent.change(el, { target: { value: "ra" } });
			await advance(0);
			fireEvent.change(el, { target: { value: "rai" } });
			await advance(0);
			// Nothing has settled yet — still the stale count from before typing.
			expect(region.textContent).toBe(`${ITEMS.length} results`);
			expect(region.textContent).not.toContain("Rainbow");

			await advance(299);
			expect(region.textContent).toBe(`${ITEMS.length} results`);

			await advance(1);
			expect(region.textContent).toBe("1 result");
		});

		it("announces zero results immediately, without waiting out the debounce — the empty state is already visible, so a stale nonzero count would contradict what's on screen", async () => {
			render(<CommandMenu items={ITEMS} open />);
			await advance(300);

			const el = input()!;
			const region = liveRegion()!;
			expect(region.textContent).toBe(`${ITEMS.length} results`);

			// "r" matches one item ("Rainbow Button") — schedules a debounced
			// announcement that has not fired yet, so the region is still
			// reporting the stale count from before this keystroke.
			fireEvent.change(el, { target: { value: "r" } });
			await advance(0);
			expect(region.textContent).toBe(`${ITEMS.length} results`);
			expect(rows()).toHaveLength(1);

			// "rz" matches nothing. The list already shows the empty state —
			// unlike a nonzero count, this is announced without waiting out the
			// debounce, so the live region never contradicts what a sighted user
			// is already looking at.
			fireEvent.change(el, { target: { value: "rz" } });
			await advance(0);
			expect(rows()).toHaveLength(0);
			expect(region.textContent).toBe("0 results");
		});

		it("clears on close, without waiting for the debounce", async () => {
			render(<CommandMenu items={ITEMS} open />);
			await advance(300);
			expect(liveRegion()!.textContent).toBe(`${ITEMS.length} results`);

			pressEscape();
			// The region goes with the panel, and the panel now fades out rather
			// than vanishing — so this waits out the exit instead of asserting in
			// the same tick. It is not a hole in the a11y behaviour: the closing
			// panel is `inert` for that whole window, which takes it and its live
			// region out of the accessibility tree, so the stale count is never
			// announced on the way out. What still matters, and is what this
			// pins, is that nothing re-announces and the region is gone by the
			// time the debounce it would have used could have fired.
			await advance(0);
			expect(liveRegion()).toBeNull();
		});
	});

	// ── React-layer additions (internals contract §9.4) ──────────────────

	// Convention C-5: an anchored surface renders `surfaceState`'s TWO values.
	// `presence.state` genuinely passes through "opening" on every entrance, so
	// rendering the wrong one is a live hazard rather than a hypothetical.
	it('never renders data-state="opening" on the panel', async () => {
		const { rerender } = render(<CommandMenu items={ITEMS} open={false} />);

		rerender(<CommandMenu items={ITEMS} open />);
		expect(panel()!.getAttribute("data-state")).toBe("open");
		await settleLegs();
	});

	// The guard on the portal-mounting order. The registered nodes have to
	// exist by the time the presence clock's layout effect looks for legs to
	// start; a `Portal` that mounts in the same commit as the surface resolves
	// its container one render too late, the group settles with nothing
	// attached, and the entrance is silently skipped.
	it("plays an entrance leg when it opens from closed", async () => {
		const { rerender } = render(<CommandMenu items={ITEMS} open={false} />);
		expect(FakeAnimation.instances.length).toBe(0);

		rerender(<CommandMenu items={ITEMS} open />);

		const targets = FakeAnimation.instances.map((animation) => animation.target);
		expect(targets).toContain(panel());
		expect(targets).toContain(scrim());
		await settleLegs();
	});

	// The two leak counters the contract names for this pairing, driven through
	// a StrictMode double-invoke.
	it("holds the scroll lock and drains the dismiss stack under StrictMode", async () => {
		const { unmount } = render(
			<StrictMode>
				<CommandMenu items={ITEMS} open />
			</StrictMode>
		);

		// acquire → release → acquire leaves the refcount at 1, before paint.
		expect(document.body.style.position).toBe("fixed");
		// push → splice → push leaves a stack of one at the same depth.
		expect(__dismissableLayerCount()).toBe(1);

		unmount();
		await waitFor(() => expect(document.body.style.position).toBe(""));
		expect(__dismissableLayerCount()).toBe(0);
	});
});
