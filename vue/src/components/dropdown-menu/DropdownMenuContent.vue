<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface DropdownMenuContentProps {
	/** Additional CSS classes, merged onto the panel. */
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
import { DROPDOWN_MENU_KEY, MENU_KEY, type MenuContext } from "./types.js";

/**
 * The portalled, anchored panel, and the level of menu-focus wiring its own
 * direct items register with.
 *
 * The source renders `DropdownMenuTrigger` and `DropdownMenuContent` as plain,
 * unconditional children — the compound owns no wrapper of its own to hang an
 * `{#if}` on — so this component gates its own DOM on the root's `open` itself,
 * the same self-gating `DropdownMenuSubContent` does for its submenu.
 *
 * No focus trap: a dropdown menu is not modal. Tab is handled inside
 * `handleKeydown` below instead — it closes the menu and is never
 * `preventDefault`ed, so the browser's own Tab traversal continues from
 * wherever real DOM focus currently sits, rather than being cycled back into a
 * trap. That also means this panel needs no eager focus-return handle the way a
 * modal surface does: `DropdownMenu`'s own `setOpen` refocuses the trigger from
 * a plain function outside this gate, so the return already lands at the
 * dismiss instant rather than at unmount, exit transition or not.
 */
defineOptions({ name: "DropdownMenuContent", inheritAttrs: false });

const props = defineProps<DropdownMenuContentProps>();

/** The `DropdownMenuItem`/`DropdownMenuSeparator`/`DropdownMenuLabel`/`DropdownMenuSub` children. */
defineSlots<{ default?: () => unknown }>();

const root = DROPDOWN_MENU_KEY.useRequired();

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher (C-1).
const panel = shallowRef<HTMLDivElement | null>(null);

// Convention C-4: exactly where the source declares `ref = $bindable(null)`.
defineExpose({ ref: panel });

// A getter property, not a plain value, so every read inside the core
// (`move()` reads `options.loop` fresh on each call) sees `root.loop` live
// rather than whatever it was when this component first mounted.
const focus = useMenuFocus({
	get loop() {
		return root.loop;
	},
});

const { registerOpenSub, closeSiblingSubs } = createOpenSubRegistry();

const presence = usePresence(() => root.open);

// The side and alignment the panel was ACTUALLY placed on — the requested ones
// until `computePosition` flips or clamps them away from a viewport edge.
// Seeded by the composable with the REQUESTED values rather than a hardcoded
// "bottom", so the common never-flipped case never depends on a first
// placement callback having fired: a wrong seed would show as a one-frame
// origin jump on every open, and only a real flip should ever move the growth
// origin. The source kept this in two `$state` locals fed by `onPlacement`.
const placement = useAnchorPosition(panel, () => ({
	anchor: () => root.triggerRef,
	side: root.side,
	align: root.align,
	offset: root.offset,
}));

// `active` stays a GETTER (C-2): the layer stays ON the stack for its whole
// exit and stops being TOP of it the instant `open` flips, so a second Escape
// during the fade is neither answered again nor swallowed on its way to
// whatever sits underneath.
useDismissable(panel, () => ({
	onDismiss: () => root.close(),
	exclude: () => [root.triggerRef],
	active: () => root.open,
}));

// The source's getter object, ported verbatim in shape and built once in
// `setup`.
const menuContext: MenuContext = {
	get focus() {
		return focus;
	},
	itemTextClass: "text-[13px]",
	get rootOpen() {
		return root.open;
	},
	get sound() {
		return root.sound;
	},
	closeAll(options) {
		// Closing the root unmounts this whole subtree — every nested
		// `DropdownMenuSub`/`DropdownMenuSubContent` goes with it, so there is
		// nothing more for this level to do to close a deeply-nested submenu's
		// own state; see menu-shared.ts's header comment.
		root.close(options);
	},
	registerOpenSub,
	closeSiblingSubs,
};
MENU_KEY.provide(menuContext);

// Items register themselves from their own post-flush watcher, which runs
// after this one — `nextTick()` waits for that flush before asking the
// (now-populated) core to move to an edge (D-V13). `presence.mounted` is part
// of the source, not just `open`: it flips one pass later and it is that pass
// which actually creates the items.
watch(
	[() => root.open, () => presence.mounted],
	([open, mounted]) => {
		if (!open || !mounted) return;
		const edge = root.focusEdge;
		void nextTick().then(() => focus.moveToEdge(edge));
	},
	{ flush: "post" }
);

function handleKeydown(event: KeyboardEvent): void {
	handleMenuContentKeydown(event, menuContext, {
		onTab: () => root.close({ returnFocus: false }),
	});
}

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away.
//
// ONE bidirectional leg, never a split enter/exit pair: the presence clock owns
// both directions, so a menu reopened mid-exit continues from where it is
// instead of snapping to invisible first. `entering` is what tells the
// transition which way it is going, and the params are read at the instant each
// leg starts.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register(anchored, (entering) => ({ side: placement.value.side, entering }))
);

// text-[13px]: this family's own density. Every item leaf inherits it from here
// via normal CSS (they carry no font-size of their own); a nested
// `DropdownMenuSubContent` gets it forwarded through `menuContext.itemTextClass`
// instead, since a portalled submenu is a DOM sibling of this panel once open,
// not a descendant — see `MenuContext.itemTextClass`'s own doc.
const classes = computed(() =>
	cn(
		"ft-dropdown-menu-content flex w-max min-w-[180px] flex-col gap-[1px] rounded-[10px] border border-border bg-popover p-[5px] text-[13px] text-popover-foreground shadow-lg outline-none",
		props.class
	)
);
</script>

<template>
	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it (D-V6): the
		teleport resolves its target during the patch that creates its children,
		so the panel is always connected to the document by the time the
		anchoring and dismiss watchers run. A closed panel emits nothing at all,
		on the server included.

		`data-state` is an ORDINARY binding carrying `surfaceState`'s TWO values
		— never "opening" (convention C-5). The source writes it imperatively
		from a transition event because its scheduler skips effects inside a
		closing branch; a presence-mounted subtree here stays reactive for the
		whole exit. `inert` is never written by hand either: the presence clock
		sets the attribute on the registered node for the whole exit, which is
		what keeps a menu on its way out from answering a click.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="panelRef"
				:id="root.contentId"
				role="menu"
				:aria-labelledby="root.triggerId"
				tabindex="-1"
				:class="classes"
				:data-state="presence.surfaceState"
				:data-side="placement.side"
				:data-align="root.align"
				:style="{ transformOrigin: originFor(placement.side, placement.align) }"
				@keydown="handleKeydown"
			>
				<slot />
			</div>
		</Portal>
	</template>
</template>
