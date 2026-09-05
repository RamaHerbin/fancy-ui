import { forwardRef, useCallback, useEffect, useInsertionEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { NAVIGATION_MENU_KEY } from "./types.js";
import type { NavigationMenuContext } from "./types.js";

export interface NavigationMenuProps {
	/** The open item's value, `""` when every panel is closed. */
	value?: string;
	/** Fires whenever the open item changes, from any trigger — pointer, keyboard or dismissal. */
	onValueChange?: (value: string) => void;
	/** Accessible name for the `<nav>` landmark. */
	label?: string;
	/** Delay in ms before a hovered trigger opens its panel. */
	openDelay?: number;
	/** Delay in ms before a panel closes after the pointer leaves it and its trigger. */
	closeDelay?: number;
	/** Typically a single `NavigationMenuList`. */
	children?: ReactNode;
	/** Additional CSS classes for the `<nav>`. */
	className?: string;
}

/**
 * Disclosure navigation: a row of triggers, at most one panel open at a time.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the source declares `ref = $bindable(null)`.
 *
 * Rest props are not spread: the source reads only these props and has no
 * rest-props object, so the port carries no wider attribute surface than the
 * component it mirrors.
 */
export const NavigationMenu = forwardRef<HTMLElement, NavigationMenuProps>(function NavigationMenu(
	{
		value: valueProp,
		onValueChange,
		label = "Main",
		openDelay = 150,
		closeDelay = 200,
		children,
		className,
	},
	forwardedRef
) {
	// The React shape of the source's `value = $bindable("")`: an internal copy
	// seeded from the prop, re-synced during render whenever the CALLER changes
	// the prop, and free to move on its own in between. That is what makes all
	// three call shapes work off one implementation — a caller driving `value`
	// from its own state, a caller who passes only `onValueChange`, and a
	// caller who passes neither and lets the trigger row run the whole thing.
	//
	// Re-synced in the render path, not an effect: an effect would paint one
	// frame of the stale value first, and the pattern React documents for
	// "adjust state when a prop changes" is exactly this.
	const [value, setValueState] = useState(valueProp ?? "");
	const [lastValueProp, setLastValueProp] = useState(valueProp);
	if (lastValueProp !== valueProp) {
		setLastValueProp(valueProp);
		setValueState(valueProp ?? "");
	}

	// The open value as it stands RIGHT NOW, ahead of the re-render `setValue`
	// schedules. The source's `value` is a `$state` assignment, visible to the
	// very next statement; React state is not, and every decision function
	// below branches on it. Two dismisses inside one tick are the case that
	// makes the difference observable: without this the second would pass
	// `setValue`'s equality guard and report `onValueChange("")` twice.
	//
	// Written eagerly by `setValue` (which only ever runs from a handler or a
	// timer, never a render) and re-synced from the committed value in an
	// insertion effect, never during render — a render React throws away must
	// not be able to publish a value nothing committed.
	const valueRef = useRef(value);
	useInsertionEffect(() => {
		valueRef.current = value;
	}, [value]);

	const [listEl, setListEl] = useState<HTMLElement | null>(null);

	// Registration order of mounted triggers. It exists purely so something
	// rendered changes when a trigger mounts or unmounts; the actual
	// left-to-right *order* used below always comes from a live DOM query,
	// never from this array's own order, so a trigger that mounts out of
	// visual order still navigates correctly.
	const [registeredOrder, setRegisteredOrder] = useState<string[]>([]);
	const [focusedValueState, setFocusedValueState] = useState<string | null>(null);

	// State, exactly as the source keeps it — and the `$state` is load-bearing
	// even though nothing renders it. In the source, the panel effect reads it
	// through `consumeFocusRequest()` and is therefore SUBSCRIBED to it, so a
	// later `requestFocus()` write re-runs that effect and moves focus into the
	// panel. A ref here would be written by the keydown and observed by
	// nothing, which breaks the one case where no other input to the panel
	// effect moves: pressing Enter/Space/ArrowDown on a trigger whose panel is
	// ALREADY open. `open()` short-circuits on its equality guard and `focus()`
	// re-sets the same value, so the panel's `isOpen`, node and item value are
	// all unchanged, and the focus request would be silently dropped.
	const [pendingFocusValue, setPendingFocusValue] = useState<string | null>(null);

	const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const clearOpenTimer = useCallback(() => {
		if (openTimer.current !== undefined) {
			clearTimeout(openTimer.current);
			openTimer.current = undefined;
		}
	}, []);

	const clearCloseTimer = useCallback(() => {
		if (closeTimer.current !== undefined) {
			clearTimeout(closeTimer.current);
			closeTimer.current = undefined;
		}
	}, []);

	function setValue(next: string) {
		clearOpenTimer();
		clearCloseTimer();
		if (valueRef.current === next) return;
		valueRef.current = next;
		setValueState(next);
		onValueChange?.(next);
	}

	// Queried fresh on every call rather than cached, so a trigger that mounted
	// out of visual order — or one a keyed list reordered after mounting — is
	// correct on the very next arrow press.
	const triggerButtons = useCallback((): HTMLElement[] => {
		if (!listEl) return [];
		return Array.from(listEl.querySelectorAll<HTMLElement>("[data-ft-nav-trigger]"));
	}, [listEl]);

	const getTriggerElement = useCallback(
		(itemValue: string): HTMLElement | null => {
			return triggerButtons().find((el) => el.dataset.value === itemValue) ?? null;
		},
		[triggerButtons]
	);

	function open(itemValue: string) {
		setValue(itemValue);
	}

	function close() {
		const closing = valueRef.current;
		setValue("");
		// Escape and an outside click both route through this one function (see
		// NavigationMenuContent's single dismiss layer), so both return focus
		// to the trigger. Real browsers already send an outside click's own
		// focus to whatever the user actually clicked, as the *default* action
		// of the underlying mousedown — which runs after every listener,
		// including this one — so a click on another focusable element still
		// lands there; this only "sticks" for a click on non-focusable space,
		// where landing on the trigger beats losing focus to `<body>`. jsdom
		// does not implement that default action (see the component test
		// file), so this refocus is unconditionally visible there — it is the
		// correct outcome for Escape either way.
		//
		// It also runs BEFORE the panel is marked inert: the state update is
		// still queued at this point, so focus is already on the trigger by the
		// time the exit starts and a keyboard user is never stranded on
		// `<body>` for the length of the fade.
		if (closing) {
			getTriggerElement(closing)?.focus();
		}
	}

	function toggle(itemValue: string) {
		if (valueRef.current === itemValue) {
			close();
		} else {
			open(itemValue);
		}
	}

	function scheduleOpen(itemValue: string) {
		clearCloseTimer();
		if (valueRef.current === itemValue) return;
		if (valueRef.current !== "") {
			// Something else is already open: the pointer is travelling along
			// the row it already committed to, not arriving fresh, so switch
			// with no delay. Re-running the open delay here is the flicker
			// every hover-with-intent surface has to avoid past its first item.
			open(itemValue);
			return;
		}
		clearOpenTimer();
		openTimer.current = setTimeout(() => setValue(itemValue), openDelay);
	}

	function scheduleClose() {
		clearOpenTimer();
		if (valueRef.current === "") return;
		clearCloseTimer();
		// No refocus here, unlike `close()` — this fires from the pointer
		// leaving, and forcing focus onto the trigger would yank it away from
		// wherever keyboard focus actually is.
		closeTimer.current = setTimeout(() => setValue(""), closeDelay);
	}

	function cancelClose() {
		clearCloseTimer();
	}

	// The request side is identity-stable — a trigger only ever calls it from a
	// keydown, and nothing depends on it by identity.
	const requestFocus = useCallback((itemValue: string) => {
		setPendingFocusValue(itemValue);
	}, []);

	// The consume side is re-created whenever the pending value moves, and that
	// identity change IS the subscription: it is listed in
	// `NavigationMenuContent`'s panel-focus effect dependencies, so a fresh
	// `requestFocus` re-runs that effect the way the source's `$state` read
	// re-runs its `$effect`. It is deliberately NOT stable across a pending
	// change — a permanently stable identity is what dropped the focus move on
	// an already-open panel.
	//
	// It cannot loop: consuming sets the pending value to `null`, which changes
	// the identity once more, and the re-run then finds nothing to consume and
	// writes nothing. A consume that matches nothing writes nothing either.
	const consumeFocusRequest = useCallback(
		(itemValue: string): boolean => {
			if (pendingFocusValue !== itemValue) return false;
			setPendingFocusValue(null);
			return true;
		},
		[pendingFocusValue]
	);

	function collapseIfOpen(itemValue: string) {
		if (valueRef.current === itemValue) setValue("");
	}

	const focus = useCallback((itemValue: string) => {
		setFocusedValueState(itemValue);
	}, []);

	// Identity-stable for the same reason as `requestFocus`: a trigger calls it
	// from its own mount effect and lists it in that effect's dependencies, so
	// a fresh function per root render would unregister and re-register
	// forever. The updaters also return the array unchanged when there is
	// nothing to do, so a duplicate register never schedules a render — the
	// React counterpart of the `untrack` the source wraps the body in.
	const registerTrigger = useCallback((itemValue: string): (() => void) => {
		setRegisteredOrder((order) => (order.includes(itemValue) ? order : [...order, itemValue]));
		return () => {
			setRegisteredOrder((order) => {
				const i = order.indexOf(itemValue);
				if (i === -1) return order;
				const next = order.slice();
				next.splice(i, 1);
				return next;
			});
		};
	}, []);

	const setListRef = useCallback((element: HTMLElement | null) => {
		setListEl(element);
	}, []);

	function goTo(button: HTMLElement) {
		const nextValue = button.dataset.value;
		if (nextValue === undefined) return;
		setFocusedValueState(nextValue);
		button.focus();
		// An already-open panel follows keyboard focus the same way it already
		// follows the pointer along the row (see `scheduleOpen`) — a panel left
		// open under a trigger that no longer has focus reads as broken, not as
		// "still open".
		if (valueRef.current !== "" && valueRef.current !== nextValue) {
			open(nextValue);
		}
	}

	function move(from: string, delta: number) {
		const buttons = triggerButtons();
		if (buttons.length === 0) return;
		const fromIndex = buttons.findIndex((el) => el.dataset.value === from);
		const base = fromIndex === -1 ? 0 : fromIndex;
		const nextIndex = (((base + delta) % buttons.length) + buttons.length) % buttons.length;
		goTo(buttons[nextIndex]!);
	}

	function moveToEdge(edge: "first" | "last") {
		const buttons = triggerButtons();
		if (buttons.length === 0) return;
		goTo(edge === "first" ? buttons[0]! : buttons[buttons.length - 1]!);
	}

	// Recomputed on every render, so it settles the instant a trigger
	// registers, unregisters, or the roving position itself moves.
	let focusedValue: string | null = null;
	if (focusedValueState !== null && registeredOrder.includes(focusedValueState)) {
		focusedValue = focusedValueState;
	} else if (registeredOrder.length === 0) {
		focusedValue = null;
	} else if (value !== "" && registeredOrder.includes(value)) {
		focusedValue = value;
	} else {
		// Prefer live DOM order over registration order for the initial
		// fallback: a trigger that mounts later but renders first on screen
		// still becomes the first tab stop. A read, never a write — the render
		// stays pure, exactly as the source's getter is.
		focusedValue = triggerButtons()[0]?.dataset.value ?? registeredOrder[0]!;
	}

	// Rebuilt on every render rather than memoised, and that rebuild is what
	// re-renders the pieces below — the React counterpart of the source
	// context's live getters. A memo would have to be keyed on every function
	// here, each of which closes over `value` and is therefore fresh per
	// render anyway, so it would never hit. The three members something depends
	// on by identity — `registerTrigger`, `setListRef` and `requestFocus` — are
	// stable regardless; `consumeFocusRequest` moves with the pending focus
	// value on purpose, see above.
	const context: NavigationMenuContext = {
		value,
		openDelay,
		closeDelay,
		listRef: listEl,
		focusedValue,
		setListRef,
		getTriggerElement,
		registerTrigger,
		open,
		close,
		toggle,
		scheduleOpen,
		scheduleClose,
		cancelClose,
		requestFocus,
		consumeFocusRequest,
		collapseIfOpen,
		focus,
		move,
		moveToEdge,
	};

	// A pending hover-intent timer must never fire into an unmounted tree.
	useEffect(() => {
		return () => {
			clearOpenTimer();
			clearCloseTimer();
		};
	}, [clearOpenTimer, clearCloseTimer]);

	return (
		<NAVIGATION_MENU_KEY.Provider value={context}>
			<nav
				ref={forwardedRef}
				aria-label={label}
				className={cn("ft-navigation-menu relative", className)}
			>
				{children}
			</nav>
		</NAVIGATION_MENU_KEY.Provider>
	);
});

NavigationMenu.displayName = "NavigationMenu";
