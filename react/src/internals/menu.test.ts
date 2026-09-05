import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { createMenuFocus } from "./menu.js";

/**
 * Builds a real menu subtree in the document, because everything this module
 * does is defined in terms of DOM order, DOM focus and `aria-disabled` — a
 * fake item list would only test the arithmetic, which is the part least
 * likely to be wrong.
 */
function mountItems(labels: Array<string | { label: string; disabled?: boolean }>): {
	container: HTMLElement;
	items: HTMLElement[];
} {
	const container = document.createElement("div");
	container.setAttribute("role", "menu");
	const items = labels.map((entry) => {
		const spec = typeof entry === "string" ? { label: entry } : entry;
		const item = document.createElement("div");
		item.setAttribute("role", "menuitem");
		item.tabIndex = -1;
		item.textContent = spec.label;
		if (spec.disabled) item.setAttribute("aria-disabled", "true");
		container.appendChild(item);
		return item;
	});
	document.body.appendChild(container);
	return { container, items };
}

function registerAll(menu: ReturnType<typeof createMenuFocus>, items: HTMLElement[]): void {
	for (const item of items) menu.register(item);
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("createMenuFocus — move", () => {
	it("starts with nothing focused", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		expect(menu.focusedIndex).toBe(-1);
	});

	it("moves real DOM focus, not just an index", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.move(1);
		expect(document.activeElement).toBe(items[0]);
	});

	it("a forward move from unset lands on the first item", () => {
		const { items } = mountItems(["Rename", "Duplicate", "Share"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.move(1);
		expect(menu.focusedIndex).toBe(0);
	});

	it("a backward move from unset lands on the last item", () => {
		const { items } = mountItems(["Rename", "Duplicate", "Share"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.move(-1);
		expect(menu.focusedIndex).toBe(2);
	});

	it("delta 0 is a no-op", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.move(1);
		menu.move(0);
		expect(menu.focusedIndex).toBe(0);
	});

	it("skips a run of consecutive disabled items as a block", () => {
		const { items } = mountItems([
			"Rename",
			{ label: "Duplicate", disabled: true },
			{ label: "Share", disabled: true },
			"Delete",
		]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.move(1);
		menu.move(1);
		expect(menu.focusedIndex).toBe(3);
		expect(document.activeElement).toBe(items[3]);
	});

	it("terminates instead of spinning when every item is disabled", () => {
		const { items } = mountItems([
			{ label: "Rename", disabled: true },
			{ label: "Duplicate", disabled: true },
		]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.move(1);
		expect(menu.focusedIndex).toBe(-1);
	});

	it("wraps at the end by default", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.move(1);
		menu.move(1);
		menu.move(1);
		expect(menu.focusedIndex).toBe(0);
	});

	it("stops at the end when loop is false", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus({ loop: false });
		registerAll(menu, items);
		menu.move(1);
		menu.move(1);
		menu.move(1);
		expect(menu.focusedIndex).toBe(1);
	});

	it("treats a natively disabled button as disabled, not merely unfocusable", () => {
		const container = document.createElement("div");
		const first = document.createElement("button");
		first.textContent = "Rename";
		const second = document.createElement("button");
		second.textContent = "Duplicate";
		second.disabled = true;
		const third = document.createElement("button");
		third.textContent = "Share";
		container.append(first, second, third);
		document.body.appendChild(container);

		const menu = createMenuFocus();
		registerAll(menu, [first, second, third]);
		menu.move(1);
		menu.move(1);
		expect(document.activeElement).toBe(third);
	});
});

describe("createMenuFocus — DOM order", () => {
	it("navigates in document order even when registration order differs", () => {
		const { items } = mountItems(["First", "Second", "Third"]);
		const menu = createMenuFocus();
		// Registered back to front, as a conditional block or a reordering
		// keyed list would produce.
		menu.register(items[2]!);
		menu.register(items[0]!);
		menu.register(items[1]!);

		menu.move(1);
		expect(document.activeElement).toBe(items[0]);
		menu.move(1);
		expect(document.activeElement).toBe(items[1]);
		menu.move(1);
		expect(document.activeElement).toBe(items[2]);
	});

	it("drops an item that left the document, so it is never a focus target", () => {
		const { items } = mountItems(["Rename", "Duplicate", "Share"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		// Removed without its unregister running — a teardown that threw, or a
		// parent removed wholesale.
		items[1]!.remove();

		menu.move(1);
		menu.move(1);
		expect(document.activeElement).toBe(items[2]);
	});
});

describe("createMenuFocus — register / unregister", () => {
	// This holds because `focusedIndex` resolves the tracked element against
	// the current ordered list, so an unregistered element reads as -1 whether
	// or not the reference to it was dropped. Mutating the reference-release
	// line in `register`'s teardown does NOT turn this test red — it is not a
	// guard, and nothing here pretends it is.
	it("focus tracking does not survive unregistering the focused item", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		const unregisterFirst = menu.register(items[0]!);
		menu.register(items[1]!);

		menu.move(1);
		expect(menu.focusedIndex).toBe(0);

		unregisterFirst();
		expect(menu.focusedIndex).toBe(-1);

		// And the next move starts from "nothing focused" rather than from the
		// vanished item's old position.
		menu.move(1);
		expect(document.activeElement).toBe(items[1]);
	});

	it("registering the same element twice does not give it two slots", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		menu.register(items[0]!);
		menu.register(items[0]!);
		menu.register(items[1]!);

		// Two slots for one element would make this second press look like a
		// no-op: focus would "move" from the item to itself.
		menu.move(1);
		expect(document.activeElement).toBe(items[0]);
		menu.move(1);
		expect(document.activeElement).toBe(items[1]);
	});

	it("unregistering a different item leaves the focused one alone", () => {
		const { items } = mountItems(["Rename", "Duplicate", "Share"]);
		const menu = createMenuFocus();
		menu.register(items[0]!);
		const unregisterSecond = menu.register(items[1]!);
		menu.register(items[2]!);

		menu.move(1);
		unregisterSecond();
		expect(menu.focusedIndex).toBe(0);
	});
});

describe("createMenuFocus — moveToEdge", () => {
	it("jumps to the first enabled item, skipping a disabled leader", () => {
		const { items } = mountItems([{ label: "Rename", disabled: true }, "Duplicate", "Share"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.moveToEdge("first");
		expect(document.activeElement).toBe(items[1]);
	});

	it("jumps to the last enabled item, skipping a disabled trailer", () => {
		const { items } = mountItems(["Rename", "Duplicate", { label: "Share", disabled: true }]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.moveToEdge("last");
		expect(document.activeElement).toBe(items[1]);
	});

	it("does nothing when every item is disabled", () => {
		const { items } = mountItems([
			{ label: "Rename", disabled: true },
			{ label: "Duplicate", disabled: true },
		]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.moveToEdge("first");
		expect(menu.focusedIndex).toBe(-1);
	});
});

describe("createMenuFocus — focusItem", () => {
	it("focuses a registered enabled item", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.focusItem(items[1]!);
		expect(document.activeElement).toBe(items[1]);
	});

	it("refuses a disabled item rather than guessing a neighbour", () => {
		const { items } = mountItems(["Rename", { label: "Duplicate", disabled: true }]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.focusItem(items[1]!);
		expect(menu.focusedIndex).toBe(-1);
		expect(document.activeElement).not.toBe(items[1]);
	});

	it("refuses an unregistered element", () => {
		const { items } = mountItems(["Rename"]);
		const stray = document.createElement("div");
		stray.tabIndex = -1;
		document.body.appendChild(stray);

		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.focusItem(stray);
		expect(menu.focusedIndex).toBe(-1);
	});
});

describe("createMenuFocus — clear", () => {
	it("clears the tracked item without moving DOM focus", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.move(1);
		menu.clear();
		expect(menu.focusedIndex).toBe(-1);
		// The DOM is deliberately left alone: a menu closing hands focus back
		// to its trigger itself, and stealing it here would fight that.
		expect(document.activeElement).toBe(items[0]);
	});
});

describe("createMenuFocus — typeahead", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("matches on the item's text content", () => {
		const { items } = mountItems(["Rename", "Duplicate", "Share"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("d");
		expect(document.activeElement).toBe(items[1]);
	});

	it("accumulates characters within the window", () => {
		const { items } = mountItems(["Save", "Share", "Send"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("s");
		menu.typeahead("h");
		expect(document.activeElement).toBe(items[1]);
	});

	it("starts a fresh query after the window expires", () => {
		const { items } = mountItems(["Save", "Share", "Hide"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("s");
		vi.advanceTimersByTime(600);
		menu.typeahead("h");
		expect(document.activeElement).toBe(items[2]);
	});

	it("cycles through matches when the same character repeats", () => {
		const { items } = mountItems(["Save", "Share", "Send"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("s");
		expect(document.activeElement).toBe(items[0]);
		menu.typeahead("s");
		expect(document.activeElement).toBe(items[1]);
		menu.typeahead("s");
		expect(document.activeElement).toBe(items[2]);
		menu.typeahead("s");
		expect(document.activeElement).toBe(items[0]);
	});

	it("breaking a cycle with a different character searches the collapsed query", () => {
		const { items } = mountItems(["Save", "Share", "Send"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("s");
		menu.typeahead("s");
		// "s" pressed twice then "e" searches "se", not the literal "sse".
		menu.typeahead("e");
		expect(document.activeElement).toBe(items[2]);
	});

	it("never lands on a disabled item", () => {
		const { items } = mountItems(["Rename", { label: "Duplicate", disabled: true }, "Delete"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("d");
		expect(document.activeElement).toBe(items[2]);
	});

	it("ignores a decorative aria-hidden glyph before the label", () => {
		const { items } = mountItems(["Rename"]);
		// The shape every menu item in this wave takes: an icon the user sees
		// but assistive tech does not, then the label.
		items[0]!.innerHTML = '<span aria-hidden="true">✎</span> Rename';
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("r");
		expect(document.activeElement).toBe(items[0]);
	});

	// Deliberately not a test for an aria-hidden shortcut appended *after* the
	// label: matching is prefix-based, so trailing text cannot change the
	// outcome either way, and such a test passes against `textContent` too.
	// This is the trailing-content case that can actually differ — an item
	// whose only text is decorative has no label to match at all.
	it("does not match an item whose entire text is aria-hidden", () => {
		const { items } = mountItems(["Rename", "Placeholder"]);
		items[1]!.innerHTML = '<span aria-hidden="true">Duplicate</span>';
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("d");
		expect(menu.focusedIndex).toBe(-1);
	});

	it("prefers an explicit data-typeahead-label over the rendered text", () => {
		const { items } = mountItems(["Rename"]);
		items[0]!.innerHTML = '<span class="sr-only">Menu item: </span>Rename';
		// sr-only text is genuinely part of the name, so it is NOT skipped —
		// an item that wants different matching says so explicitly.
		items[0]!.dataset.typeaheadLabel = "Rename";
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("r");
		expect(document.activeElement).toBe(items[0]);
	});

	it("is case-insensitive and ignores surrounding whitespace in the label", () => {
		const { items } = mountItems(["Rename"]);
		items[0]!.textContent = "  Rename  ";
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("R");
		expect(document.activeElement).toBe(items[0]);
	});

	it("destroy clears a pending buffer so the next character starts fresh", () => {
		const { items } = mountItems(["Save", "Hide"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		menu.typeahead("s");
		menu.destroy();
		menu.typeahead("h");
		expect(document.activeElement).toBe(items[1]);
	});
});

describe("createMenuFocus — onFocusChange", () => {
	it("reports the index and element on every move", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const seen: Array<[number, HTMLElement]> = [];
		const menu = createMenuFocus({ onFocusChange: (index, el) => seen.push([index, el]) });
		registerAll(menu, items);
		menu.move(1);
		menu.move(1);
		expect(seen).toEqual([
			[0, items[0]],
			[1, items[1]],
		]);
	});
});
