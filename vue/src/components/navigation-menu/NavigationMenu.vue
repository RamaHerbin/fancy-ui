<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface NavigationMenuProps {
	/** The open item's value, two-way through `v-model:value`. `""` when every panel is closed. */
	value?: string;
	/** Fires whenever the open item changes, from any trigger — pointer, keyboard or dismissal. */
	onValueChange?: (value: string) => void;
	/** Accessible name for the `<nav>` landmark. */
	label?: string;
	/** Delay in ms before a hovered trigger opens its panel. */
	openDelay?: number;
	/** Delay in ms before a panel closes after the pointer leaves it and its trigger. */
	closeDelay?: number;
	/** Additional CSS classes for the `<nav>`. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { NAVIGATION_MENU_KEY, type NavigationMenuContext } from "./types.js";

/**
 * Disclosure navigation: a row of triggers, at most one panel open at a time.
 *
 * Rest props are not spread — the source reads only its own props and has no
 * rest-props object, so the `<nav>` carries no wider attribute surface than
 * the component it mirrors.
 */
defineOptions({ name: "NavigationMenu", inheritAttrs: false });

const {
	onValueChange,
	label = "Main",
	openDelay = 150,
	closeDelay = 200,
	class: className,
} = defineProps<NavigationMenuProps>();

defineSlots<{
	/** Typically a single `NavigationMenuList`. */
	default?: () => unknown;
}>();

const model = defineModel<string>("value", { default: "" });

const el = useTemplateRef<HTMLElement>("el");
defineExpose({ ref: el });

/**
 * The open value as it stands RIGHT NOW, ahead of the write-back a bound
 * `v-model:value` only completes on its parent's next render.
 *
 * The source's `value` is a `$bindable` assignment, visible to the very next
 * statement, and every decision function below branches on it. A model bound
 * with `v-model` does NOT update its local copy until the parent has
 * re-rendered and patched the prop back down, so this mirror is what
 * reproduces the source's read-after-write. The case that makes the
 * difference observable is the Escape path: `close()` clears the value and
 * then refocuses the trigger, which fires the open panel's own `focusout` in
 * the same turn — without the mirror `collapseIfOpen` would still see the old
 * value and report `onValueChange("")` a second time.
 *
 * Writing it also means a caller who passes `value` but ignores
 * `update:value` still gets a working menu (this package's counterpart of the
 * source's bindable always winning its own assignment).
 */
const value = ref(model.value);
watch(model, (next) => {
	value.value = next;
});

const listEl = shallowRef<HTMLElement | null>(null);

// Registration order of mounted triggers. It exists purely so something
// reactive changes when a trigger mounts or unmounts; the actual
// left-to-right *order* used below always comes from a live DOM query, never
// from this array's own order, so a trigger that mounts out of visual order
// still navigates correctly.
const registeredOrder = ref<string[]>([]);
const focusedValueState = ref<string | null>(null);
const pendingFocusValue = ref<string | null>(null);

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
	if (value.value === next) return;
	value.value = next;
	model.value = next;
	onValueChange?.(next);
}

// Queried fresh on every call rather than cached, so a trigger that mounted
// out of visual order — or one a keyed list reordered after mounting — is
// correct on the very next arrow press.
function triggerButtons(): HTMLElement[] {
	if (!listEl.value) return [];
	return Array.from(listEl.value.querySelectorAll<HTMLElement>("[data-ft-nav-trigger]"));
}

function getTriggerElement(itemValue: string): HTMLElement | null {
	return triggerButtons().find((el) => el.dataset.value === itemValue) ?? null;
}

function open(itemValue: string) {
	setValue(itemValue);
}

function close() {
	const closing = value.value;
	setValue("");
	// Escape and an outside click both route through this one function (see
	// NavigationMenuContent's single dismiss layer), so both return focus to
	// the trigger. Real browsers already send an outside click's own focus to
	// whatever the user actually clicked, as the *default* action of the
	// underlying mousedown — which runs after every listener, including this
	// one — so a click on another focusable element still lands there; this
	// only "sticks" for a click on non-focusable space, where landing on the
	// trigger beats losing focus to `<body>`. jsdom does not implement that
	// default action (see the component test file), so this refocus is
	// unconditionally visible there — it is the correct outcome for Escape
	// either way.
	if (closing) {
		getTriggerElement(closing)?.focus();
	}
}

function toggle(itemValue: string) {
	if (value.value === itemValue) {
		close();
	} else {
		open(itemValue);
	}
}

function scheduleOpen(itemValue: string) {
	clearCloseTimer();
	if (value.value === itemValue) return;
	if (value.value !== "") {
		// Something else is already open: the pointer is travelling along the
		// row it already committed to, not arriving fresh, so switch with no
		// delay. Re-running the open delay here is the flicker every
		// hover-with-intent surface has to avoid past its first item.
		open(itemValue);
		return;
	}
	clearOpenTimer();
	openTimer = setTimeout(() => setValue(itemValue), openDelay);
}

function scheduleClose() {
	clearOpenTimer();
	if (value.value === "") return;
	clearCloseTimer();
	// No refocus here, unlike `close()` — this fires from the pointer leaving,
	// and forcing focus onto the trigger would yank it away from wherever
	// keyboard focus actually is.
	closeTimer = setTimeout(() => setValue(""), closeDelay);
}

function cancelClose() {
	clearCloseTimer();
}

function requestFocus(itemValue: string) {
	pendingFocusValue.value = itemValue;
}

function consumeFocusRequest(itemValue: string): boolean {
	if (pendingFocusValue.value !== itemValue) return false;
	pendingFocusValue.value = null;
	return true;
}

function collapseIfOpen(itemValue: string) {
	if (value.value === itemValue) setValue("");
}

function focus(itemValue: string) {
	focusedValueState.value = itemValue;
}

// Plain array mutation, like `ToggleGroup`'s own registry: nothing here runs
// inside a watcher keyed on `registeredOrder`, so the source's `untrack`
// wrapper — which exists to break exactly that self-triggering loop — has no
// counterpart to guard against.
function registerTrigger(itemValue: string): () => void {
	if (!registeredOrder.value.includes(itemValue)) registeredOrder.value.push(itemValue);
	return () => {
		const i = registeredOrder.value.indexOf(itemValue);
		if (i !== -1) registeredOrder.value.splice(i, 1);
	};
}

function goTo(button: HTMLElement) {
	const nextValue = button.dataset.value;
	if (nextValue === undefined) return;
	focusedValueState.value = nextValue;
	button.focus();
	// An already-open panel follows keyboard focus the same way it already
	// follows the pointer along the row (see `scheduleOpen`) — a panel left
	// open under a trigger that no longer has focus reads as broken, not as
	// "still open".
	if (value.value !== "" && value.value !== nextValue) {
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

const context: NavigationMenuContext = {
	get value() {
		return value.value;
	},
	get openDelay() {
		return openDelay;
	},
	get closeDelay() {
		return closeDelay;
	},
	get listRef() {
		return listEl.value;
	},
	get focusedValue() {
		// Read every time so this recomputes when a trigger registers,
		// unregisters, or the roving position itself moves.
		const order = registeredOrder.value;
		if (focusedValueState.value !== null && order.includes(focusedValueState.value)) {
			return focusedValueState.value;
		}
		if (order.length === 0) return null;
		if (value.value !== "" && order.includes(value.value)) return value.value;
		// Prefer live DOM order over registration order for the initial
		// fallback, same reasoning as ToggleGroup: a trigger that mounts later
		// but renders first on screen still becomes the first tab stop.
		return triggerButtons()[0]?.dataset.value ?? order[0]!;
	},
	get pendingFocusValue() {
		return pendingFocusValue.value;
	},
	setListRef(element) {
		listEl.value = element;
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

NAVIGATION_MENU_KEY.provide(context);

// A pending hover-intent timer must never fire into an unmounted tree.
// `onBeforeUnmount`, never `onUnmounted` — the DOM is still attached, like an
// action's `destroy`.
onBeforeUnmount(() => {
	clearOpenTimer();
	clearCloseTimer();
});
</script>

<template>
	<nav ref="el" :aria-label="label" :class="cn('ft-navigation-menu relative', className)">
		<slot />
	</nav>
</template>
