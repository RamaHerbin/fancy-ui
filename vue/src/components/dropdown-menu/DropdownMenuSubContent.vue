<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface DropdownMenuSubContentProps {
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, nextTick, shallowRef, watch } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useMenuFocus } from "../../internals/menu.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { handleMenuContentKeydown, createOpenSubRegistry } from "./menu-shared.js";
import { MENU_KEY, SUB_KEY, type MenuContext } from "./types.js";

/**
 * A submenu's own portalled, anchored panel, and the level of menu-focus wiring
 * its own direct items register with.
 *
 * Self-gated on its own liveness, same reasoning as `DropdownMenuContent`: the
 * consumer writes `<DropdownMenuSubContent>` unconditionally inside
 * `<DropdownMenuSub>`, so this component hides its own DOM rather than asking
 * the caller to.
 *
 * The dismiss layer registers this panel as its own: Escape and an outside
 * click close only THIS submenu (returning focus to its trigger), not the root,
 * one interaction at a time — the deliberate, shared behaviour every nested
 * overlay in this library gets, not a gap specific to submenus.
 */
defineOptions({ name: "DropdownMenuSubContent", inheritAttrs: false });

const props = defineProps<DropdownMenuSubContentProps>();

/** The `DropdownMenuItem`/`DropdownMenuSeparator`/`DropdownMenuLabel`/nested `DropdownMenuSub` children. */
defineSlots<{ default?: () => unknown }>();

// Captured before `MENU_KEY.provide(...)` below shadows it for this subtree —
// `menuContext.closeAll` delegates straight to this, so a selection three
// submenus deep still closes the whole tree in one hop (see `menu-shared.ts`'s
// header comment).
const parentMenu = MENU_KEY.useRequired();
const sub = SUB_KEY.useRequired();

// `sub.open` alone is not liveness. Closing the root — selecting a root item,
// or an external `v-model:open` write — flips only the root's state and tears
// this subtree down with it, leaving `sub.open` true for the whole global
// outro. Everything that has to know whether this panel is a live top layer
// reads THIS instead: the presence clock, which would otherwise run the
// entrance curve on the way out, and the dismiss layer, which would otherwise
// let a fading submenu swallow an Escape or an outside click that belongs to
// whatever is underneath.
//
// `parentMenu.rootOpen` rather than a family-specific root context: this level
// reads the contract every menu family implements, and republishing `live` as
// this level's own `rootOpen` below is what makes the answer compose down a
// chain of nested submenus.
//
// It is also what replaces the source's `|global` transition modifier: driving
// the presence clock off `live` starts this panel's exit in the very flush the
// root's own exit starts, so both levels fade together instead of this one
// sitting at full opacity beside a parent already fading and then popping out
// of existence with it.
const live = computed(() => sub.open && parentMenu.rootOpen);

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and the panel is created by `presence.mounted`,
// so this is `null` in `setup` (C-1).
const panel = shallowRef<HTMLDivElement | null>(null);

// Convention C-4: exactly where the source declares `ref = $bindable(null)`.
defineExpose({ ref: panel });

const focus = useMenuFocus();
const { registerOpenSub, closeSiblingSubs } = createOpenSubRegistry();

const presence = usePresence(() => live.value);

// `side` is the literal `"right"` and `align` the literal `"start"` — a submenu
// never asks for any other placement. The resolved pair goes back onto the sub
// context rather than into local state: it already drives
// `DropdownMenuSubTrigger`'s caret glyph, and a second copy here would give the
// caret and the growth origin two sources of truth that could disagree after a
// flip.
useAnchorPosition(panel, () => ({
	anchor: () => sub.triggerRef,
	side: "right",
	align: "start",
	offset: 2,
	onPlacement: (side, align) => sub.setPlacement(side, align),
}));

useDismissable(panel, () => ({
	onDismiss: () => sub.closeSub(true),
	exclude: () => [sub.triggerRef],
	active: () => live.value,
}));

const menuContext: MenuContext = {
	get focus() {
		return focus;
	},
	// Forwarded, not re-decided: this level's own density is whatever the level
	// above it — the root panel, or another `*SubContent` one level up —
	// already resolved, all the way down. See `MenuContext.itemTextClass`'s own
	// doc for why this has to travel through context rather than plain CSS
	// inheritance.
	get itemTextClass() {
		return parentMenu.itemTextClass;
	},
	// This level's own liveness, not the root's raw state: a submenu nested
	// inside THIS one is no more alive than this one is.
	get rootOpen() {
		return live.value;
	},
	// Copied from the parent level for the same reason as `itemTextClass` just
	// above: a submenu's own sound behaviour follows whatever the root
	// resolved, all the way down through nested submenus.
	get sound() {
		return parentMenu.sound;
	},
	closeAll(options) {
		parentMenu.closeAll(options);
	},
	registerOpenSub,
	closeSiblingSubs,
};
MENU_KEY.provide(menuContext);

// `nextTick()` for the same reason `DropdownMenuContent` keeps it (D-V13): the
// items register from their own post-flush watchers, which run after this one.
watch(
	[() => sub.open, () => presence.mounted],
	([open, mounted]) => {
		if (!open || !mounted) return;
		void nextTick().then(() => focus.moveToEdge("first"));
	},
	{ flush: "post" }
);

function handleKeydown(event: KeyboardEvent): void {
	if (event.key === "ArrowLeft") {
		event.preventDefault();
		sub.closeSub(true);
		return;
	}
	handleMenuContentKeydown(event, menuContext, {
		// Tab closes the *whole* tree, not just this level — the browser's own
		// Tab traversal should leave the entire menu system behind, the same as
		// it does from the root content.
		onTab: () => parentMenu.closeAll({ returnFocus: false }),
	});
}

function handleMouseEnter(): void {
	sub.keepOpen();
}

function handleMouseLeave(): void {
	sub.scheduleClose();
}

// Built ONCE in `setup`. ONE bidirectional leg with `entering` from the
// presence clock, exactly as `DropdownMenuContent` does and for the same
// reasons. The params read `sub.resolvedSide` directly rather than a local
// copy, so the caret and the growth origin can never disagree after a flip.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register(anchored, (entering) => ({ side: sub.resolvedSide, entering }))
);

// No fixed font-size in the string below — `parentMenu.itemTextClass` is
// spliced in instead, since this panel is portalled to `document.body`
// independently of its own parent panel and can't inherit that parent's size
// via plain CSS once both are open (they end up as DOM siblings, not
// ancestor/descendant). See `MenuContext.itemTextClass`'s own doc.
const classes = computed(() =>
	cn(
		"ft-dropdown-menu-content flex w-max min-w-[160px] flex-col gap-[1px] rounded-[10px] border border-border bg-popover p-[5px] text-popover-foreground shadow-lg outline-none",
		parentMenu.itemTextClass,
		props.class
	)
);
</script>

<template>
	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it (D-V6), and
		`data-state` is an ordinary binding carrying `surfaceState`'s two values
		— both for the same reasons `DropdownMenuContent` spells out. `inert`
		comes from the presence clock rather than being written by hand.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="panelRef"
				:id="sub.contentId"
				role="menu"
				:aria-labelledby="sub.triggerId"
				tabindex="-1"
				:class="classes"
				:data-state="presence.surfaceState"
				:data-side="sub.resolvedSide"
				data-align="start"
				:style="{ transformOrigin: originFor(sub.resolvedSide, sub.resolvedAlign) }"
				@keydown="handleKeydown"
				@mouseenter="handleMouseEnter"
				@mouseleave="handleMouseLeave"
			>
				<slot />
			</div>
		</Portal>
	</template>
</template>
