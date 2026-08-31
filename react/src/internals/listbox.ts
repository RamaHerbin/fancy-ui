/**
 * Listbox keyboard-navigation core: which option is "active" (highlighted,
 * `aria-activedescendant`-pointed-at) as arrow keys, Home/End and typeahead
 * move through a flat list of options, some of which may be disabled.
 *
 * This is the frozen surface `Select`, `Combobox`, `Autocomplete` and
 * `TimePicker` all consume, so every one of them gets the same two behaviours
 * right once instead of four times:
 *
 * - A run of consecutive disabled options is skipped as a block, not one
 *   step into a dead end — `move`/`moveToEdge` keep stepping past them. If
 *   *every* option is disabled, stepping terminates after at most `count()`
 *   attempts rather than looping forever hunting for an enabled option that
 *   does not exist.
 * - Typeahead accumulates characters typed within a short window and resets
 *   after it, so "ne" lands on "Netherlands" rather than re-matching "e"
 *   against everything. Repeating the same character cycles through the
 *   matches for that character, one per press, the way a native `<select>`
 *   does.
 *
 * Pure state + behaviour, no DOM: a caller wires `count`/`enabled` off
 * whatever it renders (a data array for `Select`, live DOM children for a
 * `Combobox` built on real elements) and reacts to `onActiveChange` to keep
 * the active row in view.
 *
 * `createListbox` is framework-free and stays the tested surface. `useListbox`
 * is the thin React binding on top: one store per mount, `destroy()` on
 * unmount, and `activeIndex` read through `useSyncExternalStore` because this
 * is the one index in the internals that genuinely has to drive rendering
 * (`aria-activedescendant` on the listbox, `isActive(index)` on every row).
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useConstant } from "./dom/ssr.js";
import { useEventCallback } from "./dom/use-event-callback.js";
import { useLiveRef } from "./dom/use-live-ref.js";

export interface ListboxOptions {
	/** Number of options currently rendered. */
	count: () => number;
	/** Whether the option at this index can be activated. */
	enabled?: (index: number) => boolean;
	/** Called when the active option changes, so the caller can scroll it into view. */
	onActiveChange?: (index: number) => void;
	/** Whether arrow navigation wraps at the ends. Defaults to true. */
	loop?: boolean;
}

export interface ListboxState {
	/** Index of the active option, or -1 when nothing is active. */
	readonly activeIndex: number;
	/** Moves by delta, skipping disabled options, wrapping when `loop`. `delta === 0` is a no-op. */
	move(delta: number): void;
	/** Jumps to the first or last enabled option. */
	moveToEdge(edge: "first" | "last"): void;
	/** Sets the active option directly; -1 clears it. A disabled index is left alone (no-op), never activated. */
	setActive(index: number): void;
	/** Advances typeahead with a printable character and activates the match. */
	typeahead(char: string, labelAt: (index: number) => string): void;
	/** Clears the typeahead buffer and any pending timer. Call from teardown. */
	destroy(): void;
	/**
	 * Added for React, standing in for the Svelte `$state` rune: notifies on
	 * every `activeIndex` change. Returns the unsubscribe.
	 */
	subscribe(listener: () => void): () => void;
}

/** No candidate could be found — every reachable option was disabled, or the edge was reached without `loop`. */
const NONE = null;

// How long a typeahead buffer stays open for the next character before a
// fresh keystroke starts a new search. Matches the ~500ms window most
// platforms use for native <select> typeahead.
const TYPEAHEAD_TIMEOUT_MS = 500;

/**
 * Walks from `from` in `direction`, skipping disabled options (and, without
 * `loop`, stopping dead at the edge instead of wrapping), and returns the
 * first enabled index it finds. Bounded to `count` attempts — the loop
 * cannot run more steps than there are options, so a list where every option
 * is disabled terminates instead of spinning forever.
 */
function findNext(
	from: number,
	direction: 1 | -1,
	count: number,
	loop: boolean,
	isEnabled: (index: number) => boolean
): number | typeof NONE {
	let idx = from;
	for (let attempts = 0; attempts < count; attempts++) {
		idx += direction;
		if (loop) {
			idx = ((idx % count) + count) % count;
		} else if (idx < 0 || idx >= count) {
			return NONE;
		}
		if (isEnabled(idx)) return idx;
	}
	return NONE;
}

export function createListbox(options: ListboxOptions): ListboxState {
	let activeIndex = -1;
	let buffer = "";
	let timer: ReturnType<typeof setTimeout> | null = null;
	const listeners = new Set<() => void>();

	function notify(): void {
		for (const listener of listeners) listener();
	}

	function subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}

	function isEnabled(index: number): boolean {
		return options.enabled?.(index) ?? true;
	}

	function commitActive(index: number): void {
		if (index === activeIndex) return;
		activeIndex = index;
		notify();
		options.onActiveChange?.(index);
	}

	function setActive(index: number): void {
		// -1 always clears — there is nothing to check "enabled" for on
		// "nothing active". Any other index that resolves to a disabled
		// option is left alone rather than activated: `move`, `moveToEdge`
		// and `typeahead` already never land on a disabled option themselves
		// (each walks past one to find a real candidate before ever calling
		// `commitActive`) — `setActive` was the one way in that skipped this
		// check, so a caller handing it a bad index directly (a stale
		// fallback, an unchecked default) could still activate one. No
		// skip-to-nearest here: unlike a relative `move`, a direct
		// `setActive(index)` call carries no implied direction to hunt a
		// substitute in, so the safe answer is to do nothing rather than
		// guess one.
		//
		// Bounds come first, before `enabled` is consulted at all: an index
		// outside `0..count()-1` names no option, so there is nothing for a
		// caller-supplied `enabled(index)` to answer about — it would be asked
		// about a row that does not exist, and a permissive predicate (the
		// default `?? true`) would wave it straight through to
		// `commitActive`. Publishing it puts an option id with no matching
		// row in `aria-activedescendant`, which a screen reader reads as a
		// dangling reference. `move`, `moveToEdge` and `typeahead` are all
		// bounded by `count()` already; `setActive` is the one way in that
		// takes an index from outside the module.
		if (index !== -1) {
			const count = options.count();
			if (index < 0 || index >= count) return;
			if (!isEnabled(index)) return;
		}
		commitActive(index);
	}

	function move(delta: number): void {
		if (delta === 0) return;
		const count = options.count();
		if (count <= 0) return;
		const loop = options.loop ?? true;
		const direction: 1 | -1 = delta >= 0 ? 1 : -1;
		const steps = Math.abs(delta);

		// -1 (nothing active) is not a real position to step away from: it
		// reads as "one before the first option" for a forward move and "one
		// after the last" for a backward one, so the very first arrow press
		// from an unset state lands on index 0 (ArrowDown) or the last index
		// (ArrowUp) — the platform convention this module exists to reproduce,
		// not on whatever `findNext` would make of stepping away from -1
		// itself.
		let from = activeIndex === -1 ? (direction === 1 ? -1 : count) : activeIndex;

		let found: number | typeof NONE = NONE;
		for (let i = 0; i < steps; i++) {
			const next = findNext(found ?? from, direction, count, loop, isEnabled);
			if (next === NONE) break;
			found = next;
		}

		if (found !== NONE) commitActive(found);
	}

	function moveToEdge(edge: "first" | "last"): void {
		const count = options.count();
		if (count <= 0) return;

		if (edge === "first") {
			for (let i = 0; i < count; i++) {
				if (isEnabled(i)) {
					commitActive(i);
					return;
				}
			}
			return;
		}

		for (let i = count - 1; i >= 0; i--) {
			if (isEnabled(i)) {
				commitActive(i);
				return;
			}
		}
	}

	function clearBuffer(): void {
		buffer = "";
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function typeahead(char: string, labelAt: (index: number) => string): void {
		const count = options.count();
		if (count <= 0) return;
		const lower = char.toLowerCase();

		// A run of presses of the SAME character, with nothing else typed in
		// between, is the platform's cycle-through-matches gesture rather than
		// a fresh multi-character query — "nn" searches for options starting
		// with "n" a second time, past the one already active, instead of
		// literally matching the two-letter string "nn". Any other character
		// breaks the run and starts accumulating a real query instead.
		const isRepeatChar = buffer.length > 0 && [...buffer].every((c) => c === lower);

		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(clearBuffer, TYPEAHEAD_TIMEOUT_MS);

		if (isRepeatChar) {
			// Collapsed to the single repeated character, not appended — this
			// is the deliberate choice for what happens next if a DIFFERENT
			// character breaks the cycle (see below), not an incidental detail.
			buffer = lower;
			// Search strictly after the active option, wrapping once all the
			// way around back to it, so repeated presses cycle through every
			// match instead of re-selecting the first one forever.
			for (let i = 1; i <= count; i++) {
				const candidate = (activeIndex + i + count) % count;
				if (!isEnabled(candidate)) continue;
				if (labelAt(candidate).toLowerCase().startsWith(lower)) {
					commitActive(candidate);
					return;
				}
			}
			return;
		}

		// Deliberate decision, not an accident of the collapse above: breaking
		// a same-character cycle with a different character continues from
		// that cycle's single collapsed character, not the literal keystroke
		// history. Pressing "s" three times (cycling through "s" matches)
		// then "e" searches for "se" — the same as if "s" had only been
		// pressed once — not the literal four-keystroke "sse". The
		// alternative (tracking every keystroke verbatim) would almost always
		// produce a query nothing matches, since cycling exists specifically
		// to revisit single-character matches rather than build a longer one;
		// "se" is at least a plausible two-character query the way "sse"
		// rarely is.
		buffer += lower;
		const query = buffer;
		for (let i = 0; i < count; i++) {
			if (!isEnabled(i)) continue;
			if (labelAt(i).toLowerCase().startsWith(query)) {
				commitActive(i);
				return;
			}
		}
	}

	function destroy(): void {
		clearBuffer();
	}

	return {
		get activeIndex() {
			return activeIndex;
		},
		move,
		moveToEdge,
		setActive,
		typeahead,
		destroy,
		subscribe,
	};
}

export interface UseListboxOptions {
	/**
	 * A plain number. The hook wraps it in a live ref and hands the factory the
	 * getter it expects, so a virtualised list that changes `count` between
	 * renders is honoured at call time exactly as in Svelte.
	 */
	count: number;
	/** Whether the option at this index can be activated. Read on every call, so an inline literal is fine. */
	enabled?: (index: number) => boolean;
	/** Called when the active option changes, so the caller can scroll it into view. */
	onActiveChange?: (index: number) => void;
	/** Whether arrow navigation wraps at the ends. Defaults to true. */
	loop?: boolean;
}

export interface ListboxHandle {
	/** The active option for THIS render, or -1. */
	readonly activeIndex: number;
	/** Moves by delta, skipping disabled options, wrapping when `loop`. `delta === 0` is a no-op. */
	move(delta: number): void;
	/** Jumps to the first or last enabled option. */
	moveToEdge(edge: "first" | "last"): void;
	/** Sets the active option directly; -1 clears it. A disabled index is left alone (no-op), never activated. */
	setActive(index: number): void;
	/** Advances typeahead with a printable character and activates the match. */
	typeahead(char: string, labelAt: (index: number) => string): void;
}

// -1 is the value the module starts at on both sides, so the server and the
// hydration render agree that nothing is active.
const getServerSnapshot = () => -1;

/**
 * One store per mount, `destroy()` on unmount — the consumer cannot forget the
 * teardown the way a component wiring the factory by hand could.
 *
 * `count`, `enabled`, `onActiveChange` and `loop` are all read at call time
 * from live refs, so passing them as plain values (or as inline literals that
 * change identity every render) behaves exactly like the Svelte call sites'
 * getter objects. The store is never rebuilt, so the buffered typeahead and
 * the active index survive every re-render.
 *
 * Only the returned object's identity changes, and only when `activeIndex`
 * does; the four methods are stable for the life of the component.
 */
export function useListbox(options: UseListboxOptions): ListboxHandle {
	const countRef = useLiveRef(options.count);
	const enabledRef = useLiveRef(options.enabled);
	const loopRef = useLiveRef(options.loop);
	const onActiveChange = useEventCallback(options.onActiveChange);

	const store = useConstant(() =>
		createListbox({
			count: () => countRef.current,
			enabled: (index) => enabledRef.current?.(index) ?? true,
			onActiveChange,
			get loop() {
				return loopRef.current;
			},
		})
	);

	useEffect(() => () => store.destroy(), [store]);

	const getSnapshot = useCallback(() => store.activeIndex, [store]);
	const activeIndex = useSyncExternalStore(store.subscribe, getSnapshot, getServerSnapshot);

	return useMemo(
		() => ({
			activeIndex,
			move: store.move,
			moveToEdge: store.moveToEdge,
			setActive: store.setActive,
			typeahead: store.typeahead,
		}),
		[activeIndex, store]
	);
}
