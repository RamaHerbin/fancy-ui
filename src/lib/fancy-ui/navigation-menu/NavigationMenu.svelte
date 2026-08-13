<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface NavigationMenuProps {
		/** The open item's value, `""` when every panel is closed. Bindable. */
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
		children?: Snippet;
		/** Additional CSS classes for the `<nav>`. */
		class?: string;
		/** Element reference for the `<nav>`. */
		ref?: HTMLElement | null;
	}
</script>

<script lang="ts">
	import { setContext, onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { NAVIGATION_MENU_KEY, type NavigationMenuContext } from "./types.js";

	let {
		value = $bindable(""),
		onValueChange,
		label = "Main",
		openDelay = 150,
		closeDelay = 200,
		children,
		class: className,
		ref = $bindable(null),
	}: NavigationMenuProps = $props();

	let listEl = $state<HTMLElement | null>(null);

	// Registration order of mounted triggers. A plain `$state` array, not a
	// Set or Map — Svelte's deep proxy tracks `push`/`splice` on arrays, but
	// neither `Map.set` nor `Set.add` notify subscribers, the same reason
	// ToggleGroup keeps its own roving order as an array. It exists purely so
	// something `$state`-tracked changes when a trigger mounts or unmounts;
	// the actual left-to-right *order* used below always comes from a live
	// DOM query, never from this array's own order, so a trigger that mounts
	// out of visual order still navigates correctly.
	let registeredOrder = $state<string[]>([]);
	let focusedValueState = $state<string | null>(null);
	let pendingFocusValue = $state<string | null>(null);

	let openTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	function clearOpenTimer() {
		if (openTimer !== undefined) {
			clearTimeout(openTimer);
			openTimer = undefined;
		}
	}

	function clearCloseTimer() {
		if (closeTimer !== undefined) {
			clearTimeout(closeTimer);
			closeTimer = undefined;
		}
	}

	function setValue(next: string) {
		clearOpenTimer();
		clearCloseTimer();
		if (value === next) return;
		value = next;
		onValueChange?.(next);
	}

	function triggerButtons(): HTMLElement[] {
		if (!listEl) return [];
		return Array.from(listEl.querySelectorAll<HTMLElement>("[data-ft-nav-trigger]"));
	}

	function getTriggerElement(itemValue: string): HTMLElement | null {
		return triggerButtons().find((el) => el.dataset.value === itemValue) ?? null;
	}

	function open(itemValue: string) {
		setValue(itemValue);
	}

	function close() {
		const closing = value;
		setValue("");
		// Escape and an outside click both route through this one function (see
		// NavigationMenuContent's single `dismissable` action), so both return
		// focus to the trigger. Real browsers already send an outside click's
		// own focus to whatever the user actually clicked, as the *default*
		// action of the underlying mousedown — which runs after every
		// listener, including this one — so a click on another focusable
		// element still lands there; this only "sticks" for a click on
		// non-focusable space, where landing on the trigger beats losing focus
		// to `<body>`. jsdom does not implement that default action (see the
		// component test file), so this refocus is unconditionally visible
		// there — it is the correct outcome for Escape either way.
		if (closing) {
			getTriggerElement(closing)?.focus();
		}
	}

	function toggle(itemValue: string) {
		if (value === itemValue) {
			close();
		} else {
			open(itemValue);
		}
	}

	function scheduleOpen(itemValue: string) {
		clearCloseTimer();
		if (value === itemValue) return;
		if (value !== "") {
			// Something else is already open: the pointer is travelling along
			// the row it already committed to, not arriving fresh, so switch
			// with no delay. Re-running the open delay here is the flicker
			// every hover-with-intent surface has to avoid past its first item.
			open(itemValue);
			return;
		}
		clearOpenTimer();
		openTimer = setTimeout(() => setValue(itemValue), openDelay);
	}

	function scheduleClose() {
		clearOpenTimer();
		if (value === "") return;
		clearCloseTimer();
		// No refocus here, unlike `close()` — this fires from the pointer
		// leaving, and forcing focus onto the trigger would yank it away from
		// wherever keyboard focus actually is.
		closeTimer = setTimeout(() => setValue(""), closeDelay);
	}

	function cancelClose() {
		clearCloseTimer();
	}

	function requestFocus(itemValue: string) {
		pendingFocusValue = itemValue;
	}

	function consumeFocusRequest(itemValue: string): boolean {
		if (pendingFocusValue !== itemValue) return false;
		pendingFocusValue = null;
		return true;
	}

	function collapseIfOpen(itemValue: string) {
		if (value === itemValue) setValue("");
	}

	function focus(itemValue: string) {
		focusedValueState = itemValue;
	}

	function registerTrigger(itemValue: string): () => void {
		untrack(() => {
			if (!registeredOrder.includes(itemValue)) registeredOrder.push(itemValue);
		});
		return () => {
			untrack(() => {
				const i = registeredOrder.indexOf(itemValue);
				if (i !== -1) registeredOrder.splice(i, 1);
			});
		};
	}

	function goTo(button: HTMLElement) {
		const nextValue = button.dataset.value;
		if (nextValue === undefined) return;
		focusedValueState = nextValue;
		button.focus();
		// An already-open panel follows keyboard focus the same way it already
		// follows the pointer along the row (see `scheduleOpen`) — a panel
		// left open under a trigger that no longer has focus reads as broken,
		// not as "still open".
		if (value !== "" && value !== nextValue) {
			open(nextValue);
		}
	}

	function move(from: string, delta: number) {
		const buttons = triggerButtons();
		if (buttons.length === 0) return;
		const fromIndex = buttons.findIndex((el) => el.dataset.value === from);
		const base = fromIndex === -1 ? 0 : fromIndex;
		const nextIndex = (((base + delta) % buttons.length) + buttons.length) % buttons.length;
		goTo(buttons[nextIndex]);
	}

	function moveToEdge(edge: "first" | "last") {
		const buttons = triggerButtons();
		if (buttons.length === 0) return;
		goTo(edge === "first" ? buttons[0] : buttons[buttons.length - 1]);
	}

	const context: NavigationMenuContext = {
		get value() {
			return value;
		},
		get openDelay() {
			return openDelay;
		},
		get closeDelay() {
			return closeDelay;
		},
		get listRef() {
			return listEl;
		},
		get focusedValue() {
			// Read every time so this recomputes when a trigger registers,
			// unregisters, or the roving position itself moves.
			const order = registeredOrder;
			if (focusedValueState !== null && order.includes(focusedValueState)) {
				return focusedValueState;
			}
			if (order.length === 0) return null;
			if (value !== "" && order.includes(value)) return value;
			// Prefer live DOM order over registration order for the initial
			// fallback, same reasoning as ToggleGroup: a trigger that mounts
			// later but renders first on screen still becomes the first tab
			// stop.
			return triggerButtons()[0]?.dataset.value ?? order[0];
		},
		setListRef(el) {
			listEl = el;
		},
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
	setContext(NAVIGATION_MENU_KEY, context);

	onMount(() => {
		return () => {
			clearOpenTimer();
			clearCloseTimer();
		};
	});
</script>

<nav bind:this={ref} aria-label={label} class={cn("ft-navigation-menu relative", className)}>
	{@render children?.()}
</nav>
