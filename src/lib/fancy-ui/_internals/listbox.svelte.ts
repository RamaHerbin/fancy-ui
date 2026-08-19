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
 */

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
	let activeIndex = $state(-1);
	let buffer = "";
	let timer: ReturnType<typeof setTimeout> | null = null;

	function isEnabled(index: number): boolean {
		return options.enabled?.(index) ?? true;
	}

	function commitActive(index: number): void {
		if (index === activeIndex) return;
		activeIndex = index;
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
		if (index !== -1 && !isEnabled(index)) return;
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
	};
}
