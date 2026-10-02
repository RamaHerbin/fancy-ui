<script lang="ts">
export interface DropdownMenuSubProps {}
</script>

<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from "vue";

import type { Side, Align } from "../../internals/anchor-position.js";
import { sound as soundFx } from "../../sound/sound.js";
import { useFancyId } from "../../internals/use-id.js";
import { MENU_KEY, SUB_KEY, type SubContext } from "./types.js";

/**
 * The boundary component coordinating one submenu's open state and its
 * hover-intent timers. Renders no DOM of its own — its `*SubTrigger` and
 * `*SubContent` children do.
 */
defineOptions({ name: "DropdownMenuSub", inheritAttrs: false });

defineProps<DropdownMenuSubProps>();

/** The `DropdownMenuSubTrigger` and `DropdownMenuSubContent`. */
defineSlots<{ default?: () => unknown }>();

// The *parent* level's context — captured before this component provides its
// own `MENU_KEY` (which it doesn't: only `DropdownMenuSubContent` does, scoped
// to its own subtree). This is what lets a selection deep inside this submenu
// close the whole tree, and what lets opening this submenu close a sibling one
// at the same level.
const parentMenu = MENU_KEY.useRequired();

const uid = useFancyId();
const contentId = `${uid}-content`;
const triggerId = `${uid}-trigger`;

const open = ref(false);
// Plain locals, exactly as in the source: nothing renders off the trigger
// element, the close timer or the registry handle.
let triggerRef: HTMLElement | null = null;
// Reported by the anchoring core alongside the side: a submenu clamped along
// its cross axis near a viewport edge no longer touches its trigger at the
// requested corner, and its entrance has to grow from the real one.
const resolvedSide = shallowRef<Side>("right");
const resolvedAlign = shallowRef<Align>("start");
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let unregisterOpenSub: (() => void) | null = null;

// Close-intent delay: leaving the trigger (or the content) starts this timer
// rather than closing immediately, so a pointer travelling from the trigger row
// into the submenu — necessarily crossing empty space for an instant — doesn't
// flicker the submenu shut before it arrives.
const CLOSE_INTENT_MS = 200;

function clearCloseTimer(): void {
	if (closeTimer !== null) {
		clearTimeout(closeTimer);
		closeTimer = null;
	}
}

function openSub(): void {
	clearCloseTimer();
	if (open.value) return;
	if (triggerRef) parentMenu.closeSiblingSubs(triggerRef);
	open.value = true;
	if (triggerRef) {
		// A close driven by the parent — the whole tree closing after a
		// selection or Escape, or a sibling submenu opening — is silent: the
		// root's own cue (or the sibling's `open`) already told the story.
		unregisterOpenSub = parentMenu.registerOpenSub(triggerRef, () => closeSub(false, true));
	}
	// A submenu is a real panel opening; it sounds like one. Inherited from the
	// root's `sound` prop through the parent level's context.
	if (parentMenu.sound) soundFx.play("open");
}

function closeSub(returnFocus: boolean, silent = false): void {
	clearCloseTimer();
	if (!open.value) return;
	open.value = false;
	unregisterOpenSub?.();
	unregisterOpenSub = null;
	if (returnFocus) triggerRef?.focus();
	if (!silent && parentMenu.sound) soundFx.play("close");
}

function keepOpen(): void {
	clearCloseTimer();
}

function scheduleClose(): void {
	clearCloseTimer();
	closeTimer = setTimeout(() => {
		closeTimer = null;
		closeSub(false);
	}, CLOSE_INTENT_MS);
}

// Cancels a pending close-intent timer, and releases this submenu's own
// registration in the parent's open-sub registry, on destroy — not just from
// the event handlers above. A keyed `v-for` reordering can destroy this exact
// `DropdownMenuSub` while the parent context and its siblings stay alive;
// without this, a stale timer or a stale `unregisterOpenSub` closure lingers
// referencing a component that's already gone. Every call along that path
// already guards itself against a detached/stale target, so this was never a
// crash — it's hygiene, done anyway because there's no reason to leave either
// armed. `onBeforeUnmount`, never `onUnmounted`: the DOM is still attached,
// like an action's `destroy`.
onBeforeUnmount(() => {
	clearCloseTimer();
	unregisterOpenSub?.();
});

// The source's getter object, ported verbatim in shape and built once in
// `setup`.
const context: SubContext = {
	get open() {
		return open.value;
	},
	contentId,
	triggerId,
	get triggerRef() {
		return triggerRef;
	},
	get resolvedSide() {
		return resolvedSide.value;
	},
	get resolvedAlign() {
		return resolvedAlign.value;
	},
	setTriggerRef(el) {
		triggerRef = el;
	},
	setPlacement(side, align) {
		resolvedSide.value = side;
		resolvedAlign.value = align;
	},
	openSub,
	closeSub,
	keepOpen,
	scheduleClose,
};
SUB_KEY.provide(context);
</script>

<template>
	<slot />
</template>
