import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { createListbox, useListbox, type UseListboxOptions } from "./listbox.js";

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

	// Same reasoning one step earlier: an index outside `0..count()-1` names
	// no option at all, so `enabled(index)` is being asked about a row that
	// does not exist and the default predicate says yes. Publishing it would
	// put an option id with no matching row into `aria-activedescendant`.
	it("refuses an index past the end, leaving the previous state untouched", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }];
		const onActiveChange = vi.fn();
		const lb = makeListbox(items, { onActiveChange });
		lb.setActive(0);
		onActiveChange.mockClear();

		lb.setActive(2);
		expect(lb.activeIndex).toBe(0);
		lb.setActive(99);
		expect(lb.activeIndex).toBe(0);
		expect(onActiveChange).not.toHaveBeenCalled();
	});

	it("refuses a negative index other than the -1 sentinel", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }];
		const onActiveChange = vi.fn();
		const lb = makeListbox(items, { onActiveChange });
		lb.setActive(1);
		onActiveChange.mockClear();

		lb.setActive(-2);
		expect(lb.activeIndex).toBe(1);
		expect(onActiveChange).not.toHaveBeenCalled();
	});

	it("refuses any index while the list is empty, -1 apart", () => {
		const lb = makeListbox([]);
		lb.setActive(0);
		expect(lb.activeIndex).toBe(-1);
	});

	// The count is read at call time, so a list that shrank between renders
	// is honoured by the bounds check rather than by the index it was valid
	// under.
	it("reads the count at call time, so a shrunk list refuses a once-valid index", () => {
		const items: Item[] = [{ label: "A" }, { label: "B" }, { label: "C" }];
		const lb = makeListbox(items);
		lb.setActive(2);
		expect(lb.activeIndex).toBe(2);

		items.length = 1;
		lb.setActive(-1);
		lb.setActive(2);
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

// `subscribe` is the port's replacement for the `$state` rune on
// `activeIndex` — the one edit to the factory. It exists so
// `useSyncExternalStore` can drive rendering off the active index, so the
// contract it has to keep is exactly the one `commitActive` already kept for
// `onActiveChange`: fire on a real change, stay silent on a no-op.
describe("createListbox — subscribe", () => {
	it("notifies on every activeIndex change", () => {
		const listener = vi.fn();
		const lb = makeListbox([{ label: "A" }, { label: "B" }]);
		lb.subscribe(listener);

		lb.setActive(1);
		expect(listener).toHaveBeenCalledTimes(1);

		lb.move(1);
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("stays silent when the index does not actually change", () => {
		const listener = vi.fn();
		const lb = makeListbox([{ label: "A" }, { label: "B", disabled: true }]);
		lb.setActive(0);
		lb.subscribe(listener);

		lb.setActive(0); // same index
		lb.setActive(1); // disabled, refused
		lb.move(0); // no direction

		expect(listener).not.toHaveBeenCalled();
	});

	it("notifies before onActiveChange, so a re-render is already scheduled when the callback runs", () => {
		const order: string[] = [];
		const lb = makeListbox([{ label: "A" }, { label: "B" }], {
			onActiveChange: () => order.push("onActiveChange"),
		});
		lb.subscribe(() => order.push("subscribe"));

		lb.setActive(1);

		expect(order).toEqual(["subscribe", "onActiveChange"]);
	});

	it("the returned unsubscribe stops the notifications", () => {
		const listener = vi.fn();
		const lb = makeListbox([{ label: "A" }, { label: "B" }]);
		const unsubscribe = lb.subscribe(listener);

		unsubscribe();
		lb.setActive(1);

		expect(listener).not.toHaveBeenCalled();
	});

	it("supports more than one listener", () => {
		const first = vi.fn();
		const second = vi.fn();
		const lb = makeListbox([{ label: "A" }, { label: "B" }]);
		lb.subscribe(first);
		lb.subscribe(second);

		lb.setActive(1);

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});
});

describe("useListbox", () => {
	function useProbe(props: UseListboxOptions) {
		return useListbox(props);
	}

	it("starts at -1 — nothing is active before the first interaction", () => {
		const { result } = renderHook(() => useListbox({ count: 3 }));
		expect(result.current.activeIndex).toBe(-1);
	});

	it("re-renders the consumer with the new index when it moves", () => {
		const { result } = renderHook(() => useListbox({ count: 3 }));

		act(() => {
			result.current.move(1);
		});

		expect(result.current.activeIndex).toBe(0);
	});

	it("reads `count` at call time, so a list that grew since the last render is honoured", () => {
		const { result, rerender } = renderHook(useProbe, { initialProps: { count: 1 } });
		act(() => {
			result.current.moveToEdge("last");
		});
		expect(result.current.activeIndex).toBe(0);

		rerender({ count: 4 });
		act(() => {
			result.current.moveToEdge("last");
		});
		expect(result.current.activeIndex).toBe(3);
	});

	it("reads `enabled` at call time, so a freshly disabled option is skipped", () => {
		const { result, rerender } = renderHook(useProbe, {
			initialProps: { count: 3, enabled: () => true } as UseListboxOptions,
		});

		rerender({ count: 3, enabled: (i: number) => i !== 0 });
		act(() => {
			result.current.move(1);
		});

		expect(result.current.activeIndex).toBe(1);
	});

	it("reads `loop` at call time, so flipping it to false stops the wrap", () => {
		const { result, rerender } = renderHook(useProbe, {
			initialProps: { count: 2, loop: true } as UseListboxOptions,
		});
		act(() => {
			result.current.setActive(1);
		});

		rerender({ count: 2, loop: false });
		act(() => {
			result.current.move(1);
		});

		expect(result.current.activeIndex).toBe(1);
	});

	it("calls the latest onActiveChange, without rebuilding the store", () => {
		const first = vi.fn();
		const second = vi.fn();
		const { result, rerender } = renderHook(useProbe, {
			initialProps: { count: 3, onActiveChange: first } as UseListboxOptions,
		});

		rerender({ count: 3, onActiveChange: second });
		act(() => {
			result.current.move(1);
		});

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledExactlyOnceWith(0);
	});

	it("keeps the method identities stable while the handle identity tracks activeIndex", () => {
		const { result } = renderHook(() => useListbox({ count: 3 }));
		const before = result.current;

		act(() => {
			result.current.move(1);
		});

		expect(result.current).not.toBe(before);
		expect(result.current.move).toBe(before.move);
		expect(result.current.moveToEdge).toBe(before.moveToEdge);
		expect(result.current.setActive).toBe(before.setActive);
		expect(result.current.typeahead).toBe(before.typeahead);
	});

	it("does not expose destroy — unmount cleanup cannot be forgotten", () => {
		const { result } = renderHook(() => useListbox({ count: 3 }));
		expect("destroy" in result.current).toBe(false);
	});

	describe("with fake timers", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("keeps the typeahead buffer across re-renders", () => {
			const labels = ["Netherlands", "Egypt"];
			const at = (i: number) => labels[i] ?? "";
			const { result, rerender } = renderHook(useProbe, { initialProps: { count: 2 } });

			act(() => {
				result.current.typeahead("n", at);
			});
			expect(result.current.activeIndex).toBe(0);

			rerender({ count: 2 });
			act(() => {
				result.current.typeahead("e", at);
			});

			expect(result.current.activeIndex).toBe(0); // "ne", not a fresh "e"
		});

		it("clears the pending typeahead timer on unmount", () => {
			const { result, unmount } = renderHook(() => useListbox({ count: 1 }));
			act(() => {
				result.current.typeahead("n", () => "Netherlands");
			});
			expect(vi.getTimerCount()).toBe(1);

			unmount();

			expect(vi.getTimerCount()).toBe(0);
		});

		// StrictMode's mount → cleanup → mount runs `destroy()` between the
		// two mounts. The store is created once and survives it, so the
		// handle's methods still drive the store React subscribed to; and the
		// double mount leaves no second timer behind at unmount.
		it("survives a StrictMode double mount with one store and no leaked timer", () => {
			const { result, unmount } = renderHook(() => useListbox({ count: 3 }), {
				wrapper: StrictMode,
			});

			act(() => {
				result.current.move(1);
			});
			expect(result.current.activeIndex).toBe(0);

			act(() => {
				result.current.typeahead("n", () => "Netherlands");
			});
			expect(vi.getTimerCount()).toBe(1);

			unmount();

			expect(vi.getTimerCount()).toBe(0);
		});
	});
});
