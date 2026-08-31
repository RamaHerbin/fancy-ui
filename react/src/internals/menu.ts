/**
 * Menu keyboard-navigation core: which item holds **real DOM focus** as arrow
 * keys, Home/End and typeahead move through a `role="menu"` surface.
 *
 * This is the counterpart to `listbox.ts`, and the difference between the two
 * is the whole reason both exist. A listbox keeps focus on its input or
 * trigger and points at the active row with `aria-activedescendant`; a menu
 * moves focus onto the item itself. That is the WAI-ARIA menu pattern, and it
 * is what assistive technology expects when it meets `role="menu"` — so a menu
 * built on `aria-activedescendant` reads as broken even though nothing about
 * it looks wrong. Consumers must not add `aria-activedescendant` to a surface
 * driven by this module.
 *
 * Three guarantees, so `DropdownMenu`, `ContextMenu` and every submenu get
 * them once rather than three times:
 *
 * - **Items navigate in DOM order, not registration order.** Mount order and
 *   document order diverge routinely — a conditional block, a list that
 *   reorders, a submenu that mounts before the item above it. Ordering is
 *   therefore resolved by `compareDocumentPosition` at navigation time, not
 *   by the order `register` happened to be called in. This is also what makes
 *   the promise survive React's child-before-parent effect ordering for free.
 * - **Disabled items are skipped**, a consecutive run of them as a block, and
 *   movement terminates rather than spinning when every item is disabled.
 * - **Typeahead** accumulates characters within a short window and resets
 *   after it, with a repeated character cycling through its matches — the
 *   same semantics as the listbox core, so the two feel identical to use.
 *
 * The focused item is tracked as an *element*, not an index: menus mutate
 * their item list while open (a filtered list, a submenu opening), and an
 * index captured before that mutation silently points at a different item
 * afterwards. `focusedIndex` is derived from the element on read.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { RefCallback } from "react";
import { useConstant } from "./dom/ssr.js";
import { useEventCallback } from "./dom/use-event-callback.js";
import { useLiveRef } from "./dom/use-live-ref.js";

export interface MenuFocusOptions {
	/** Whether arrow navigation wraps at the ends. Defaults to true. */
	loop?: boolean;
	/** Called when focus moves to an item, with the item's index and element. */
	onFocusChange?: (index: number, element: HTMLElement) => void;
}

export interface MenuFocusState {
	/**
	 * Index of the focused item in DOM order, or -1 when focus is not on an item.
	 *
	 * Computed on read from the live ordered list, exactly like the Svelte
	 * getter — so the value is correct on a fresh read and `document.activeElement`
	 * is never wrong. It is deliberately NOT React state: nothing re-renders when
	 * focus moves, because real DOM focus does the rendering through `:focus` /
	 * `:focus-visible`. Use `onFocusChange`, or opt into `useMenuFocusedIndex`
	 * when a component genuinely must render off the number.
	 */
	readonly focusedIndex: number;
	/** Registers an item element. Returns an unregister function; call it on destroy. */
	register(element: HTMLElement): () => void;
	/** Moves focus by delta, skipping disabled items. `delta === 0` is a no-op. */
	move(delta: number): void;
	/** Moves focus to the first or last enabled item. */
	moveToEdge(edge: "first" | "last"): void;
	/** Focuses a specific element, if it is registered and enabled. */
	focusItem(element: HTMLElement): void;
	/** Clears the focused item without moving DOM focus. */
	clear(): void;
	/**
	 * Advances typeahead with a printable character and focuses the match.
	 *
	 * Matches against the item's `data-typeahead-label` when it has one, and
	 * otherwise against its visible text — decorative `aria-hidden` content
	 * (icon glyphs, `<kbd>` shortcuts) is excluded either way. Set the
	 * attribute whenever the item knows its own label as a string; it is
	 * cheaper and more reliable than making this reconstruct it from the DOM.
	 */
	typeahead(char: string): void;
	/** Clears the typeahead buffer and any pending timer. Call from teardown. */
	destroy(): void;
	/**
	 * Added for React. Notifies on every `focusedElement` change, so
	 * `useMenuFocusedIndex` can read the index through `useSyncExternalStore`.
	 * The mutation source is outside React's knowledge — a `focusItem` from a
	 * `pointerenter`, a `typeahead` from a document keydown — which is exactly
	 * the case that API exists for.
	 */
	subscribe(listener: () => void): () => void;
}

// Matches the window used by `listbox.ts`, and by native menus on most
// platforms. Divergence between the two would be felt immediately: the same
// keystrokes behave differently in a menu and in a select.
const TYPEAHEAD_TIMEOUT_MS = 500;

/**
 * Orders two elements by their position in the document.
 *
 * The identity case is not decoration: `compareDocumentPosition` returns 0 for
 * an element compared with itself, so returning a non-zero value there would
 * claim an element sorts after itself — not a valid total order, and
 * `Array.prototype.sort` is entitled to produce an arbitrary arrangement when
 * given one. Duplicates should never reach here (`register` refuses them), so
 * this is the second of two locks on the same door rather than the only one.
 */
function compareDocumentOrder(a: HTMLElement, b: HTMLElement): number {
	if (a === b) return 0;
	return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/**
 * The text of an element as a sighted user reads it: every text node except
 * those inside a subtree marked `aria-hidden="true"`.
 *
 * `textContent` is the obvious choice and the wrong one. It walks every text
 * node regardless of `aria-hidden`, so an item rendered as a decorative glyph
 * plus a label — `<span aria-hidden="true">✎</span> Rename`, which is exactly
 * the shape the menu components use — yields `"✎ Rename"`, and typing "r"
 * matches nothing. The user sees a list starting with "Rename" and the
 * keyboard disagrees, with no way to tell why.
 *
 * `aria-hidden` is the right signal to key on because this library already
 * requires it on decorative icons and on the `<kbd>` shortcut text, so items
 * that follow the existing convention get correct typeahead for free. What
 * this deliberately does *not* skip is `sr-only` content, which is visually
 * hidden but genuinely part of the item's name — an item can override the
 * whole computation with `data-typeahead-label` when it wants something else.
 */
function visibleTextOf(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
	if (node.nodeType !== Node.ELEMENT_NODE) return "";
	const element = node as HTMLElement;
	if (element.getAttribute("aria-hidden") === "true") return "";
	let text = "";
	for (const child of Array.from(element.childNodes)) text += visibleTextOf(child);
	return text;
}

/**
 * Note on a case this module cannot handle and jsdom cannot demonstrate: an
 * item that becomes natively `disabled` *while it holds DOM focus*. A real
 * browser force-blurs it to `<body>`; jsdom leaves focus on it. Either way
 * nothing here listens for that blur, so `focusedIndex` keeps reporting the
 * now-unfocusable item until the next `move`, `focusItem` or `clear`. A
 * consumer that disables items dynamically should call `clear()` or move
 * focus itself, rather than assume this module noticed.
 */
function isDisabled(element: HTMLElement): boolean {
	if (element.getAttribute("aria-disabled") === "true") return true;
	// A native `disabled` button is not focusable at all, so treating it as
	// enabled would make `move` "succeed" onto an element that then refuses
	// focus, stranding focus on whatever held it before.
	return "disabled" in element && (element as HTMLButtonElement).disabled === true;
}

export function createMenuFocus(options: MenuFocusOptions = {}): MenuFocusState {
	// Registration order — deliberately not the navigation order. See
	// `orderedItems` for why.
	const registered: HTMLElement[] = [];
	// The one edit against the Svelte source: `$state<HTMLElement | null>(null)`
	// becomes a plain `let` plus a `notify()` at each of the three assignment
	// sites, backed by the listener set below.
	let focusedElement: HTMLElement | null = null;
	let buffer = "";
	let timer: ReturnType<typeof setTimeout> | null = null;
	const listeners = new Set<() => void>();

	function notify(): void {
		for (const listener of listeners) listener();
	}

	/**
	 * The registered items that are still in the document, in document order.
	 *
	 * Disconnected elements are dropped rather than trusted: an item whose
	 * component was destroyed without its unregister running (an error during
	 * teardown, a parent removed wholesale) would otherwise stay in the list
	 * forever as a focus target that cannot be focused.
	 */
	function orderedItems(): HTMLElement[] {
		return registered.filter((element) => element.isConnected).sort(compareDocumentOrder);
	}

	function focusAt(items: HTMLElement[], index: number): void {
		const element = items[index];
		if (!element) return;
		focusedElement = element;
		notify();
		element.focus();
		options.onFocusChange?.(index, element);
	}

	/**
	 * Walks from `from` in `direction`, skipping disabled items and either
	 * wrapping or stopping dead at the edge, and returns the first enabled
	 * index. Bounded to `items.length` attempts so an all-disabled menu
	 * terminates instead of spinning.
	 */
	function findNext(
		items: HTMLElement[],
		from: number,
		direction: 1 | -1,
		loop: boolean
	): number | null {
		const count = items.length;
		let idx = from;
		for (let attempts = 0; attempts < count; attempts++) {
			idx += direction;
			if (loop) {
				idx = ((idx % count) + count) % count;
			} else if (idx < 0 || idx >= count) {
				return null;
			}
			const element = items[idx];
			if (element && !isDisabled(element)) return idx;
		}
		return null;
	}

	function indexOfFocused(items: HTMLElement[]): number {
		return focusedElement ? items.indexOf(focusedElement) : -1;
	}

	function register(element: HTMLElement): () => void {
		// A second registration of the same element is ignored rather than
		// stored twice. A duplicate would make the element occupy two slots in
		// the ordered list, so one arrow press would appear to do nothing, and
		// it would hand `sort` a pair it cannot order consistently. Re-running
		// a registration effect without its teardown is an ordinary enough
		// mistake in a consumer that this should not be its problem.
		if (!registered.includes(element)) registered.push(element);
		return () => {
			const at = registered.indexOf(element);
			if (at !== -1) registered.splice(at, 1);
			// Releasing the reference, not enforcing a behaviour: focus
			// tracking already stops surviving unregistration, because
			// `focusedIndex` looks the element up in the *current* ordered
			// list and an unregistered element is not in it. Dropping the
			// reference here only avoids retaining a detached element for as
			// long as the menu lives.
			if (focusedElement === element) {
				focusedElement = null;
				notify();
			}
		};
	}

	function move(delta: number): void {
		if (delta === 0) return;
		const items = orderedItems();
		if (items.length === 0) return;
		const loop = options.loop ?? true;
		const direction: 1 | -1 = delta >= 0 ? 1 : -1;
		const steps = Math.abs(delta);

		// Nothing focused is not a position to step away from: it reads as one
		// before the first item going forward, one past the last going back,
		// so the first ArrowDown lands on the first item and the first ArrowUp
		// on the last — the convention this module exists to reproduce.
		const current = indexOfFocused(items);
		const from = current === -1 ? (direction === 1 ? -1 : items.length) : current;

		let found: number | null = null;
		for (let i = 0; i < steps; i++) {
			const next = findNext(items, found ?? from, direction, loop);
			if (next === null) break;
			found = next;
		}

		if (found !== null) focusAt(items, found);
	}

	function moveToEdge(edge: "first" | "last"): void {
		const items = orderedItems();
		if (items.length === 0) return;

		if (edge === "first") {
			for (let i = 0; i < items.length; i++) {
				if (!isDisabled(items[i]!)) {
					focusAt(items, i);
					return;
				}
			}
			return;
		}

		for (let i = items.length - 1; i >= 0; i--) {
			if (!isDisabled(items[i]!)) {
				focusAt(items, i);
				return;
			}
		}
	}

	function focusItem(element: HTMLElement): void {
		const items = orderedItems();
		const index = items.indexOf(element);
		// An unregistered or disabled element is left alone rather than
		// focused. Unlike a relative `move`, a direct `focusItem` carries no
		// direction to hunt a substitute in, so doing nothing beats guessing.
		if (index === -1 || isDisabled(element)) return;
		focusAt(items, index);
	}

	function clear(): void {
		focusedElement = null;
		notify();
	}

	function clearBuffer(): void {
		buffer = "";
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function labelOf(element: HTMLElement): string {
		// An explicit label always wins. A menu item knows its own label as a
		// string; asking the DOM to reconstruct it is guesswork we only fall
		// back to when the item did not say.
		const explicit = element.dataset.typeaheadLabel;
		return (explicit ?? visibleTextOf(element)).trim().toLowerCase();
	}

	function typeahead(char: string): void {
		const items = orderedItems();
		if (items.length === 0) return;
		const lower = char.toLowerCase();

		// A run of the SAME character with nothing else typed in between is the
		// platform's cycle-through-matches gesture, not a fresh multi-character
		// query: "nn" searches for "n" a second time past the focused item
		// rather than matching the literal string "nn".
		const isRepeatChar = buffer.length > 0 && [...buffer].every((c) => c === lower);

		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(clearBuffer, TYPEAHEAD_TIMEOUT_MS);

		if (isRepeatChar) {
			// Collapsed to the single character, not appended — so breaking the
			// cycle with a different character continues from "s" + "e", not
			// from the literal keystroke history "sss" + "e", which would match
			// nothing. Cycling exists to revisit single-character matches, not
			// to build a longer query.
			buffer = lower;
			const from = indexOfFocused(items);
			for (let i = 1; i <= items.length; i++) {
				const candidate = (from + i + items.length) % items.length;
				const element = items[candidate]!;
				if (isDisabled(element)) continue;
				if (labelOf(element).startsWith(lower)) {
					focusAt(items, candidate);
					return;
				}
			}
			return;
		}

		buffer += lower;
		const query = buffer;
		for (let i = 0; i < items.length; i++) {
			const element = items[i]!;
			if (isDisabled(element)) continue;
			if (labelOf(element).startsWith(query)) {
				focusAt(items, i);
				return;
			}
		}
	}

	function destroy(): void {
		clearBuffer();
	}

	function subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}

	return {
		get focusedIndex() {
			return indexOfFocused(orderedItems());
		},
		register,
		move,
		moveToEdge,
		focusItem,
		clear,
		typeahead,
		destroy,
		subscribe,
	};
}

/**
 * One store per mount, torn down on unmount.
 *
 * The options are handed to the factory as a getter object over live refs, so
 * passing `loop` as a PLAIN VALUE behaves identically to the Svelte call sites'
 * `get loop() { … }` — the factory reads it lazily at navigation time, and a
 * re-render that changes it is honoured without rebuilding anything.
 *
 * The returned handle's identity NEVER changes, so it goes straight into a
 * context value with no memo dance, and no item re-renders when focus moves.
 * `destroy()` is still on the handle, but a consumer never has to call it: the
 * unmount cleanup below closes the typeahead timer that the Svelte side's
 * `DropdownMenuContent` forgets (divergence D-5).
 */
export function useMenuFocus(options: MenuFocusOptions = {}): MenuFocusState {
	const loop = useLiveRef(options.loop);
	const onFocusChange = useEventCallback(options.onFocusChange);

	const menu = useConstant(() =>
		createMenuFocus({
			get loop() {
				return loop.current;
			},
			onFocusChange,
		})
	);

	useEffect(() => {
		return () => {
			menu.destroy();
		};
	}, [menu]);

	return menu;
}

/**
 * A per-item callback ref — one line in each item component, replacing the
 * Svelte side's per-item registration effect.
 *
 * Registration happens in the ref callback (commit phase) rather than an
 * effect, so it survives React's detach-then-attach protocol: the previous
 * registration is released before the new node registers. React 18 ref
 * callbacks cannot return a cleanup — that is 19-only — so the unregister is
 * held locally instead.
 *
 * Registration order is irrelevant: `orderedItems()` sorts by
 * `compareDocumentPosition` at navigation time.
 */
export function useMenuItemRef(menu: MenuFocusState): RefCallback<HTMLElement> {
	const unregister = useRef<(() => void) | null>(null);

	return useCallback(
		(node: HTMLElement | null) => {
			unregister.current?.();
			unregister.current = node ? menu.register(node) : null;
		},
		[menu]
	);
}

/** The server never has a focused item, and neither does the hydration render. */
const getServerFocusedIndex = () => -1;

/**
 * Subscribes to the focused index so a component can render off it.
 *
 * Opt-in, and discouraged for the reason `focusedIndex`'s own doc comment
 * gives: real DOM focus is what should drive rendering, through `:focus` /
 * `:focus-visible`. Reach for this only when a component genuinely cannot.
 */
export function useMenuFocusedIndex(menu: MenuFocusState): number {
	const getSnapshot = useCallback(() => menu.focusedIndex, [menu]);
	return useSyncExternalStore(menu.subscribe, getSnapshot, getServerFocusedIndex);
}
