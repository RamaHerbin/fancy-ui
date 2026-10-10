<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface DropdownMenuSubTriggerProps {
	/** Disables the row: skipped by keyboard navigation and typeahead, inert to click/hover. */
	disabled?: boolean;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { MENU_KEY, SUB_KEY } from "./types.js";

defineOptions({ name: "DropdownMenuSubTrigger", inheritAttrs: false });

const { disabled = false, class: className } = defineProps<DropdownMenuSubTriggerProps>();

defineSlots<{
	/** Leading icon. */
	icon?: () => unknown;
	/** The row's label. */
	default?: () => unknown;
}>();

const parentMenu = MENU_KEY.useRequired();
const sub = SUB_KEY.useRequired();

const item = useTemplateRef<HTMLButtonElement>("item");
let openIntentTimer: ReturnType<typeof setTimeout> | null = null;

// Open-intent delay, mirroring `DropdownMenuSub`'s close-intent one: a pointer
// merely passing over this row on its way somewhere else shouldn't pop the
// submenu open.
const OPEN_INTENT_MS = 150;

// This row is itself a menu item at the *parent* level — it takes part in the
// parent's arrow-key navigation and typeahead exactly like a `DropdownMenuItem`
// does, on top of owning its own submenu's open state. Its label span (below)
// is isolated from the icon and the caret — both `aria-hidden` siblings — so
// the menu core's typeahead fallback (visible text, skipping `aria-hidden`
// subtrees) already matches this row correctly; see `DropdownMenuItem`'s own
// comment for why this component doesn't set `data-typeahead-label` to
// duplicate that.
//
// Hand-written rather than `useMenuItem`, because the same effect also
// publishes the element on the sub context, and both halves have to be
// released together.
watch(
	item,
	(node, _prev, onCleanup) => {
		if (!node) return;
		sub.setTriggerRef(node);
		const unregister = parentMenu.focus.register(node);
		onCleanup(() => {
			unregister();
			sub.setTriggerRef(null);
		});
	},
	{ flush: "post" }
);

// Cancels a pending open-intent timer on destroy, not just on mouseleave — a
// keyed `v-for` reordering can destroy this exact component while the parent
// context and its siblings stay alive, and a timer left running past that point
// would call `sub.openSub()` against a `SubContext` this component no longer
// owns a row in. Every downstream call along that path happens to guard itself
// against a stale/detached element, so this was never a crash — but there's no
// reason to leave a callback armed once the row it belongs to is gone.
onBeforeUnmount(() => clearOpenIntent());

function clearOpenIntent(): void {
	if (openIntentTimer !== null) {
		clearTimeout(openIntentTimer);
		openIntentTimer = null;
	}
}

function handleClick(): void {
	if (disabled) return;
	// Same reasoning as `DropdownMenuItem`'s own click handler: hover already
	// syncs the parent menu's tracked focus position, but a click reached
	// without one first (a touch tap) wouldn't otherwise.
	if (item.value) parentMenu.focus.focusItem(item.value);
	sub.openSub();
}

function handleMouseEnter(): void {
	if (disabled || !item.value) return;
	sub.keepOpen();
	parentMenu.focus.focusItem(item.value);
	clearOpenIntent();
	openIntentTimer = setTimeout(() => {
		openIntentTimer = null;
		sub.openSub();
	}, OPEN_INTENT_MS);
}

function handleMouseLeave(): void {
	clearOpenIntent();
	sub.scheduleClose();
}

// ArrowRight always means "into the submenu", regardless of which side it
// actually rendered on after a flip — see `SubContext.resolvedSide`'s own doc
// comment. Only this row's own ArrowRight is handled here; ArrowLeft belongs to
// `DropdownMenuSubContent`, on the element it's actually about once focus has
// moved inside.
function handleKeydown(event: KeyboardEvent): void {
	if (disabled) return;
	if (event.key === "ArrowRight") {
		event.preventDefault();
		sub.openSub();
	}
}

// No font-size here — same reasoning as `DropdownMenuItem`'s own classes: it
// inherits from whichever panel this row renders inside.
const classes = computed(() =>
	cn(
		"ft-dropdown-menu-item flex w-full cursor-pointer items-center justify-between gap-[10px] rounded-[6px] px-[10px] py-[7px] text-left text-foreground outline-none",
		"hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
		"disabled:pointer-events-none disabled:opacity-50",
		className
	)
);
</script>

<template>
	<button
		ref="item"
		:id="sub.triggerId"
		type="button"
		role="menuitem"
		tabindex="-1"
		:disabled="disabled"
		:aria-disabled="disabled ? 'true' : undefined"
		aria-haspopup="menu"
		:aria-expanded="sub.open"
		:aria-controls="sub.open ? sub.contentId : undefined"
		:class="classes"
		@click="handleClick"
		@mouseenter="handleMouseEnter"
		@mouseleave="handleMouseLeave"
		@keydown="handleKeydown"
	>
		<span class="flex items-center gap-[10px]">
			<span v-if="$slots.icon" class="ft-dropdown-menu-item-icon" aria-hidden="true">
				<slot name="icon" />
			</span>
			<span><slot /></span>
		</span>
		<span aria-hidden="true" class="ft-dropdown-menu-sub-caret text-muted-foreground text-[10px]">
			{{ sub.resolvedSide === "left" ? "‹" : "›" }}
		</span>
	</button>
</template>
