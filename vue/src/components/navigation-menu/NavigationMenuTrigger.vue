<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Native `<button>` attributes and listeners are forwarded to the trigger; the managed
 * ARIA, state and structural attributes stay the component's. A forwarded `disabled`
 * leaves the roving order and makes the trigger inert.
 */
export interface NavigationMenuTriggerProps {
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
	/** Native `disabled`: leaves the roving order, never opens, calls no listener below. */
	disabled?: boolean;
	/** Called after the component's own handling, never while disabled. */
	onClick?: ((event: MouseEvent) => void) | ((event: MouseEvent) => void)[];
	/** Called after the component's own handling, never while disabled. */
	onPointerenter?: ((event: PointerEvent) => void) | ((event: PointerEvent) => void)[];
	/** Called after the component's own handling, never while disabled. */
	onPointerleave?: ((event: PointerEvent) => void) | ((event: PointerEvent) => void)[];
	/** Called after the component's own handling, never while disabled. */
	onKeydown?: ((event: KeyboardEvent) => void) | ((event: KeyboardEvent) => void)[];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useAttrs, useTemplateRef, watch } from "vue";

import { callListener } from "../../internals/call-listener.js";
import { cn } from "../../utils.js";
import { NAVIGATION_MENU_KEY, NAVIGATION_MENU_ITEM_KEY } from "./types.js";

defineOptions({ name: "NavigationMenuTrigger", inheritAttrs: false });

const attrs = useAttrs();

const {
	class: className,
	disabled = false,
	onClick,
	onPointerenter,
	onPointerleave,
	onKeydown,
} = defineProps<NavigationMenuTriggerProps>();

defineSlots<{
	/** The trigger's label. */
	default?: () => unknown;
}>();

const el = useTemplateRef<HTMLButtonElement>("el");
defineExpose({ ref: el });

const item = NAVIGATION_MENU_ITEM_KEY.useRequired();
const root = NAVIGATION_MENU_KEY.useRequired();

const isOpen = computed(() => root.value === item.value);
const tabIndexAttr = computed(() => (root.focusedValue === item.value ? 0 : -1));

let releaseRegistration: (() => void) | null = null;

// A forwarded native `disabled` keeps the trigger out of the roving order (a
// disabled button cannot take focus, so it must never hold the tab stop) and
// makes it inert: none of its handlers open, move or call the consumer's
// listener.
function joinTriggerOrder() {
	if (disabled) return;
	releaseRegistration = root.registerTrigger(item.value);
}

function leaveTriggerOrder() {
	releaseRegistration?.();
	releaseRegistration = null;
}

// `onMounted`, not an `immediate` watch. Svelte's `$effect` has two properties
// at once: it never runs on the server, and its first client run lands after
// the DOM exists. A `watch(..., { immediate: true })` has neither — Vue treats
// an immediate callback watcher as "runs immediately", so it fires during SSR
// setup. The server would emit `tabindex="-1"` on every trigger while the
// client's first render gives the first one `0`, and production hydration does
// not rectify attribute mismatches. `onMounted` is the one phase with both of
// Svelte's properties; `onBeforeUnmount` mirrors the effect's cleanup.
onMounted(joinTriggerOrder);
onBeforeUnmount(leaveTriggerOrder);

// The effect's *re-run* path: this item's value changing mid-session tears the
// previous registration down and puts the new one up, exactly as the Svelte
// effect's cleanup-then-body does. Not `immediate` — the first registration is
// `onMounted`'s above — and `post` so it lands in the flush a Svelte effect
// would.
//
// Turning `disabled` on or off mid-session leaves or rejoins the order the
// same way.
watch(
	() => [item.value, disabled] as const,
	() => {
		leaveTriggerOrder();
		joinTriggerOrder();
	},
	{ flush: "post" }
);

// Click is immediate, no hover-intent delay — an explicit click is already the
// user's decision, there is no "did they mean it" travel to protect against
// the way there is for a pointer merely passing over the row.
function handleClick(event: MouseEvent) {
	if (disabled) return;
	root.toggle(item.value);
	root.focus(item.value);
	// Deliberate, not incidental, the same reasoning as ToggleGroupItem: a
	// plain `<button>` is only guaranteed to take focus on click in some
	// browsers (macOS Safari notably does not, by default). Without this,
	// clicking a trigger would open its panel but leave the roving tab stop —
	// and DOM focus — wherever it last was.
	el.value?.focus();
	callListener(onClick, event);
}

function handlePointerEnter(event: PointerEvent) {
	if (disabled) return;
	root.scheduleOpen(item.value);
	callListener(onPointerenter, event);
}

function handlePointerLeave(event: PointerEvent) {
	root.scheduleClose();
	// Leaving still schedules the close (the trigger can turn disabled while
	// its panel is open); only the consumer listener is guarded.
	if (disabled) return;
	callListener(onPointerleave, event);
}

// There is deliberately no `focus` handler opening the panel here. A keyboard
// user tabbing *past* a trigger on their way elsewhere must not open it — only
// Enter/Space/ArrowDown, an explicit request, does that. It also happens to be
// exactly what keeps Escape well-behaved: closing returns focus to this
// trigger (see `close()`), and if focus opened the panel, that same
// programmatic refocus would reopen it immediately — the pointer-and-keyboard
// fight the panel's own test file pins down.
function handleKeydown(event: KeyboardEvent) {
	if (disabled) return;
	handleKeydownCore(event);
	callListener(onKeydown, event);
}

function handleKeydownCore(event: KeyboardEvent) {
	switch (event.key) {
		case "Enter":
		case " ":
		case "ArrowDown":
			event.preventDefault();
			root.open(item.value);
			root.focus(item.value);
			root.requestFocus(item.value);
			break;
		case "ArrowRight":
			event.preventDefault();
			root.move(item.value, 1);
			break;
		case "ArrowLeft":
			event.preventDefault();
			root.move(item.value, -1);
			break;
		case "Home":
			event.preventDefault();
			root.moveToEdge("first");
			break;
		case "End":
			event.preventDefault();
			root.moveToEdge("last");
			break;
	}
}

const classes = computed(() =>
	cn(
		"ft-navigation-menu-trigger text-muted-foreground inline-flex cursor-pointer items-center gap-1 rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium transition-colors",
		"hover:bg-accent hover:text-accent-foreground focus-visible:outline-none",
		isOpen.value && "bg-accent text-accent-foreground",
		className
	)
);
</script>

<template>
	<button
		ref="el"
		@click="handleClick"
		@pointerenter="handlePointerEnter"
		@pointerleave="handlePointerLeave"
		@keydown="handleKeydown"
		v-bind="attrs"
		type="button"
		:id="item.triggerId"
		data-ft-nav-trigger
		:data-value="item.value"
		:class="classes"
		:aria-expanded="isOpen"
		:aria-controls="isOpen ? item.contentId : undefined"
		:tabindex="tabIndexAttr"
		:disabled="disabled"
	>
		<slot />
		<span class="ft-navigation-menu-caret" aria-hidden="true">▾</span>
	</button>
</template>

<style scoped>
/*
 * Reduced motion keeps the whole rotation, not just its transition, out of
 * the base rule set — the caret is decorative (open/closed state is already
 * carried by `aria-expanded`), so under reduced motion it simply stays put
 * rather than only losing the animated easing between states.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-navigation-menu-caret {
		display: inline-block;
		transition: transform 150ms ease;
	}

	.ft-navigation-menu-trigger[aria-expanded="true"] .ft-navigation-menu-caret {
		transform: rotate(180deg);
	}
}
</style>
