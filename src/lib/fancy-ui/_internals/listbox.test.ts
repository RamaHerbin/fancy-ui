import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { createListbox } from "./listbox.svelte.js";

interface Item {
	label: string;
	disabled?: boolean;
}

function makeListbox(
	items: Item[],
	opts: { loop?: boolean; onActiveChange?: (i: number) => void } = {}
) {
	return createListbox({
		count: () => items.length,
		enabled: (i) => !items[i]?.disabled,
		loop: opts.loop,
		onActiveChange: opts.onActiveChange,
	});
}

function labelAt(items: Item[]) {
	return (i: number) => items[i]?.label ?? "";
}

describe("createListbox — move", () => {
	it("starts unset, with activeIndex -1", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }];
		const lb = makeListbox(items);
		expect(lb.activeIndex).toBe(-1);
	});

	it("a forward move from unset lands on the first option, not the second", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C" }];
		const lb = makeListbox(items);
		lb.move(1);
		expect(lb.activeIndex).toBe(0);
	});

	it("a backward move from unset lands on the last option — the ArrowUp-opens-at-the-bottom convention", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C" }];
		const lb = makeListbox(items);
		lb.move(-1);
		expect(lb.activeIndex).toBe(2);
	});

	it("steps one at a time forward and backward", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C" }];
		const lb = makeListbox(items);
		lb.move(1);
		lb.move(1);
		expect(lb.activeIndex).toBe(1);
		lb.move(-1);
		expect(lb.activeIndex).toBe(0);
	});

	it("wraps at the end by default", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C" }];
		const lb = makeListbox(items);
		lb.setActive(2);
		lb.move(1);
		expect(lb.activeIndex).toBe(0);
	});

	it("wraps at the start by default", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C" }];
		const lb = makeListbox(items);
		lb.setActive(0);
		lb.move(-1);
		expect(lb.activeIndex).toBe(2);
	});

	it("does not wrap when loop is false — stays put at the last option", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C" }];
		const onActiveChange = vi.fn();
		const lb = makeListbox(items, { loop: false, onActiveChange });
		lb.setActive(2);
		onActiveChange.mockClear();
		lb.move(1);
		expect(lb.activeIndex).toBe(2);
		expect(onActiveChange).not.toHaveBeenCalled();
	});

	it("does not wrap when loop is false — stays put at the first option", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C" }];
		const lb = makeListbox(items, { loop: false });
		lb.setActive(0);
		lb.move(-1);
		expect(lb.activeIndex).toBe(0);
	});

	// The behaviour the whole module exists for: a run of disabled options is
	// skipped as one block, landing straight on the next enabled option
	// rather than stalling one step into the run.
	it("skips a run of consecutive disabled options as a block", () => {
		const items: Item[] = [
			{ label: "A" },
			{ label: "B", disabled: true },
			{ label: "C", disabled: true },
			{ label: "D" },
		];
		const lb = makeListbox(items);
		lb.setActive(0);
		lb.move(1);
		expect(lb.activeIndex).toBe(3);
	});

	it("skips a run of consecutive disabled options moving backward too", () => {
		const items: Item[] = [
			{ label: "A" },
			{ label: "B", disabled: true },
			{ label: "C", disabled: true },
			{ label: "D" },
		];
		const lb = makeListbox(items);
		lb.setActive(3);
		lb.move(-1);
		expect(lb.activeIndex).toBe(0);
	});

	// The classic infinite-loop trap this pattern is prone to: with every
	// option disabled there is no enabled index to land on, ever. This must
	// terminate — not hang, not blow the call stack — leaving the state
	// unset. Written against the module BEFORE the attempts bound existed in
	// `findNext`, this test hung indefinitely (removing the `attempts < count`
	// guard reproduces that instantly); it is the guard, not incidental
	// coverage, that keeps it green.
	it("terminates without moving when every option is disabled, instead of looping forever", () => {
		const items: Item[] = [
			{ label: "A", disabled: true },
			{ label: "B", disabled: true },
			{ label: "C", disabled: true },
		];
		const onActiveChange = vi.fn();
		const lb = makeListbox(items, { onActiveChange });

		lb.move(1);

		expect(lb.activeIndex).toBe(-1);
		expect(onActiveChange).not.toHaveBeenCalled();
	});

	it("terminates without moving when every option is disabled and loop is false", () => {
		const items: Item[] = [
			{ label: "A", disabled: true },
			{ label: "B", disabled: true },
		];
		const lb = makeListbox(items, { loop: false });
		lb.move(-1);
		expect(lb.activeIndex).toBe(-1);
	});

	it("does nothing with zero options", () => {
		const lb = makeListbox([]);
		lb.move(1);
		expect(lb.activeIndex).toBe(-1);
	});

	it("a delta with magnitude greater than one steps that many enabled options", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }];
		const lb = makeListbox(items);
		lb.setActive(0);
		lb.move(2);
		expect(lb.activeIndex).toBe(2);
	});

	// move(delta) with delta 0 has no direction to step in — it must leave
	// the state exactly as it found it, not fall into the one-step-forward
	// a naive `Math.max(1, Math.abs(delta))` floor would otherwise produce.
	it("delta 0 is a no-op", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C" }];
		const onActiveChange = vi.fn();
		const lb = makeListbox(items, { onActiveChange });
		lb.setActive(1);
		onActiveChange.mockClear();

		lb.move(0);

		expect(lb.activeIndex).toBe(1);
		expect(onActiveChange).not.toHaveBeenCalled();
	});

	it("delta 0 from an unset state stays unset", () => {
		const lb = makeListbox([{ label: "A" }, { label: "B" }]);
		lb.move(0);
		expect(lb.activeIndex).toBe(-1);
	});

	// Two disabled options in a row is not proof the walk is bounded by
	// count rather than by "at most two disabled in sequence" — a longer
	// run pins that down.
	it("skips a run of three or more consecutive disabled options as a block", () => {
		const items: Item[] = [
			{ label: "A" },
			{ label: "B", disabled: true },
			{ label: "C", disabled: true },
			{ label: "D", disabled: true },
			{ label: "E", disabled: true },
			{ label: "F" },
		];
		const lb = makeListbox(items);
		lb.setActive(0);
		lb.move(1);
		expect(lb.activeIndex).toBe(5);
	});

	// The first and last options disabled at once, combined with wrap,
	// is the case most likely to trip up an off-by-one in the wrap math:
	// wrapping forward from the last enabled option must skip the disabled
	// first option too and land on the next enabled one after it, not on
	// the disabled edge itself.
	it("skips a disabled option at both ends when wrapping forward", () => {
		const items: Item[] = [
			{ label: "A", disabled: true },
			{ label: "B" },
			{ label: "C" },
			{ label: "D", disabled: true },
		];
		const lb = makeListbox(items);
		lb.setActive(2); // C, the last enabled option
		lb.move(1);
		expect(lb.activeIndex).toBe(1); // wraps past D (disabled) and A (disabled) to B
	});

	it("skips a disabled option at both ends when wrapping backward", () => {
		const items: Item[] = [
			{ label: "A", disabled: true },
			{ label: "B" },
			{ label: "C" },
			{ label: "D", disabled: true },
		];
		const lb = makeListbox(items);
		lb.setActive(1); // B, the first enabled option
		lb.move(-1);
		expect(lb.activeIndex).toBe(2); // wraps past A (disabled) and D (disabled) to C
	});
});

describe("createListbox — moveToEdge", () => {
	it("jumps to the first enabled option", () => {
		const items: Item[] = [{ label: "A", disabled: true }, { label: "B" }, { label: "C" }];
		const lb = makeListbox(items);
		lb.moveToEdge("first");
		expect(lb.activeIndex).toBe(1);
	});

	it("jumps to the last enabled option", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C", disabled: true }];
		const lb = makeListbox(items);
		lb.moveToEdge("last");
		expect(lb.activeIndex).toBe(1);
	});

	it("does nothing when every option is disabled", () => {
		const items: Item[] = [
			{ label: "A", disabled: true },
			{ label: "B", disabled: true },
		];
		const onActiveChange = vi.fn();
		const lb = makeListbox(items, { onActiveChange });
		lb.moveToEdge("first");
		expect(lb.activeIndex).toBe(-1);
		expect(onActiveChange).not.toHaveBeenCalled();
	});
});

describe("createListbox — setActive", () => {
	it("sets the index and fires onActiveChange", () => {
		const onActiveChange = vi.fn();
		const lb = makeListbox([{ label: "A" }, { label: "B" }], { onActiveChange });
		lb.setActive(1);
		expect(lb.activeIndex).toBe(1);
		expect(onActiveChange).toHaveBeenCalledExactlyOnceWith(1);
	});

	it("does not re-fire onActiveChange when set to the already-active index", () => {
		const onActiveChange = vi.fn();
		const lb = makeListbox([{ label: "A" }, { label: "B" }], { onActiveChange });
		lb.setActive(1);
		onActiveChange.mockClear();
		lb.setActive(1);
		expect(onActiveChange).not.toHaveBeenCalled();
	});

	it("-1 clears the active index", () => {
		const lb = makeListbox([{ label: "A" }, { label: "B" }]);
		lb.setActive(1);
		lb.setActive(-1);
		expect(lb.activeIndex).toBe(-1);
	});

	// Unlike move/moveToEdge/typeahead, setActive takes a caller-supplied
	// index directly rather than discovering one by walking — so it is the
	// one entry point a caller could hand a disabled index to without the
	// module ever having chosen it. It must refuse rather than trust it: a
	// consumer building on this module (Combobox, say) calling
	// `setActive(someUncheckedFallbackIndex)` must not be able to land the
	// active option on a disabled row this way.
	it("refuses to activate a disabled index, leaving the previous state untouched", () => {
		const items: Item[] = [{ label: "A" }, { label: "B", disabled: true }, { label: "C" }];
		const onActiveChange = vi.fn();
		const lb = makeListbox(items, { onActiveChange });
		lb.setActive(0);
		onActiveChange.mockClear();

		lb.setActive(1);

		expect(lb.activeIndex).toBe(0);
		expect(onActiveChange).not.toHaveBeenCalled();
	});

	it("refuses to activate a disabled index even from an unset state", () => {
		const items: Item[] = [{ label: "A", disabled: true }, { label: "B" }];
		const lb = makeListbox(items);
		lb.setActive(0);
		expect(lb.activeIndex).toBe(-1);
	});
});

describe("createListbox — typeahead", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("a single character activates the first enabled option whose label starts with it", () => {
		const items: Item[] = [{ label: "Svelte" }, { label: "React" }, { label: "Vue" }];
		const lb = makeListbox(items);
		lb.typeahead("r", labelAt(items));
		expect(lb.activeIndex).toBe(1);
	});

	it("is case-insensitive", () => {
		const items: Item[] = [{ label: "Svelte" }];
		const lb = makeListbox(items);
		lb.typeahead("S", labelAt(items));
		expect(lb.activeIndex).toBe(0);
	});

	it("skips a disabled option even when its label matches", () => {
		const items: Item[] = [{ label: "React", disabled: true }, { label: "Redux" }];
		const lb = makeListbox(items);
		lb.typeahead("r", labelAt(items));
		expect(lb.activeIndex).toBe(1);
	});

	// The reason this module accumulates instead of treating every keystroke
	// as its own fresh query: "ne" must land on "Netherlands", not re-match
	// "e" against "Belgium" (which also contains no leading e, but the point
	// stands for any list with an unrelated "E..." entry — see the next
	// test) — a single-character re-match on "e" would jump somewhere typing
	// "ne" never asked for.
	it("accumulates characters typed within the window into one query", () => {
		const items: Item[] = [{ label: "Egypt" }, { label: "Netherlands" }, { label: "New Zealand" }];
		const lb = makeListbox(items);
		lb.typeahead("n", labelAt(items));
		expect(lb.activeIndex).toBe(1); // "n" alone already matches Netherlands first
		vi.advanceTimersByTime(100); // well inside the window
		lb.typeahead("e", labelAt(items));
		expect(lb.activeIndex).toBe(1); // "ne" still matches Netherlands, not Egypt
	});

	it("starts a fresh query once the window has elapsed", () => {
		const items: Item[] = [{ label: "Netherlands" }, { label: "Egypt" }];
		const lb = makeListbox(items);
		lb.typeahead("n", labelAt(items));
		expect(lb.activeIndex).toBe(0);

		vi.advanceTimersByTime(600); // past the window — buffer resets
		lb.typeahead("e", labelAt(items));
		expect(lb.activeIndex).toBe(1); // "e" alone now, not "ne"
	});

	// Repeating one character is the platform's cycle gesture, not a
	// two-letter query for "nn".
	it("repeating the same character cycles through its matches instead of re-selecting the first one", () => {
		const items: Item[] = [
			{ label: "Norway" },
			{ label: "Netherlands" },
			{ label: "New Zealand" },
			{ label: "Portugal" },
		];
		const lb = makeListbox(items);
		lb.typeahead("n", labelAt(items));
		expect(lb.activeIndex).toBe(0); // Norway
		lb.typeahead("n", labelAt(items));
		expect(lb.activeIndex).toBe(1); // Netherlands
		lb.typeahead("n", labelAt(items));
		expect(lb.activeIndex).toBe(2); // New Zealand
		lb.typeahead("n", labelAt(items));
		expect(lb.activeIndex).toBe(0); // wraps back around to Norway
	});

	// The documented, deliberate choice for what happens when a same-character
	// cycle is broken by a genuinely different character: the buffer
	// continues from the cycle's single collapsed character, not from the
	// literal keystroke history. Three presses of "s" (cycling through "s"
	// matches) then "e" searches for "se" — exactly as if "s" had only been
	// pressed once — not the literal four-keystroke "sse", which this list
	// has no match for at all.
	it("breaking a repeat-cycle with a different character continues from the collapsed character, not the literal history", () => {
		const items: Item[] = [{ label: "Sydney" }, { label: "Seattle" }, { label: "Springfield" }];
		const lb = makeListbox(items);
		lb.typeahead("s", labelAt(items)); // buffer "s" -> Sydney
		expect(lb.activeIndex).toBe(0);
		lb.typeahead("s", labelAt(items)); // repeat -> cycles to Seattle, buffer stays "s"
		expect(lb.activeIndex).toBe(1);
		lb.typeahead("s", labelAt(items)); // repeat -> cycles to Springfield
		expect(lb.activeIndex).toBe(2);

		lb.typeahead("e", labelAt(items)); // breaks the cycle: "s" + "e" = "se"
		expect(lb.activeIndex).toBe(1); // Seattle, the only "se..." match — not "sse" (no match)
	});

	it("does nothing when nothing matches", () => {
		const items: Item[] = [{ label: "Svelte" }];
		const onActiveChange = vi.fn();
		const lb = makeListbox(items, { onActiveChange });
		lb.typeahead("z", labelAt(items));
		expect(lb.activeIndex).toBe(-1);
		expect(onActiveChange).not.toHaveBeenCalled();
	});

	// A stale timer left running from an earlier keystroke, alongside a new
	// one from the current keystroke, is the "two buffers racing" bug: the
	// old timer would eventually fire and clear a buffer the new keystrokes
	// are still building on top of, or vice versa. Only one timer must ever
	// be pending at a time.
	it("a rapid sequence of keystrokes keeps exactly one pending timer, not one per keystroke", () => {
		const items: Item[] = [{ label: "Netherlands" }];
		const lb = makeListbox(items);
		lb.typeahead("n", labelAt(items));
		lb.typeahead("e", labelAt(items));
		lb.typeahead("t", labelAt(items));
		expect(vi.getTimerCount()).toBe(1);
	});

	it("destroy clears the buffer, so the next keystroke starts fresh rather than continuing the old query", () => {
		const items: Item[] = [{ label: "Netherlands" }, { label: "Egypt" }];
		const lb = makeListbox(items);
		lb.typeahead("n", labelAt(items));
		lb.destroy();

		lb.typeahead("e", labelAt(items));
		expect(lb.activeIndex).toBe(1); // fresh "e" query, not accumulated "ne"
	});

	it("destroy clears the pending timer", () => {
		const items: Item[] = [{ label: "Netherlands" }];
		const lb = makeListbox(items);
		lb.typeahead("n", labelAt(items));
		expect(vi.getTimerCount()).toBe(1);
		lb.destroy();
		expect(vi.getTimerCount()).toBe(0);
	});
});
