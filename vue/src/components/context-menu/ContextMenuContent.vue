<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface ContextMenuContentProps {
	/** Additional CSS classes, merged onto the panel. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, watch } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useMenuFocus } from "../../internals/menu.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { handleMenuContentKeydown, createOpenSubRegistry } from "../dropdown-menu/menu-shared.js";
import { MENU_KEY, type MenuContext, CONTEXT_MENU_KEY } from "./types.js";

/**
 * The portalled, anchored panel, and the level of menu-focus wiring its own
 * direct items register with.
 *
 * Self-gated on the root's `open`, same reasoning as `DropdownMenuContent`.
 * Not modal: no focus trap, no scroll lock. Positioned against a *virtual*
 * anchor — `ContextMenu`'s own zero-size anchor span, moved to the last
 * right-click's coordinates — instead of a real trigger element, but the
 * positioning core's flip/clamp behaviour needs nothing different for that: a
 * zero-size `DOMRect` at the pointer flips and clamps at the viewport edges
 * exactly the same way a real element's rect does — and the growth origin
 * follows that same resolved side, so a menu that flipped to sit *above* a
 * click near the bottom of the viewport grows out of its own bottom edge, the
 * one still touching the pointer, instead of its top. The exit collapses back
 * into that same corner.
 *
 * Focus needs nothing here: `ContextMenu`'s own `setOpen` returns focus to
 * whatever was focused before the right-click, from a plain function outside
 * this gate, so the return still happens at the dismiss instant rather than
 * waiting out the fade.
 */
defineOptions({ name: "ContextMenuContent", inheritAttrs: false });

const props = defineProps<ContextMenuContentProps>();

/** The `ContextMenuItem`/`ContextMenuSeparator`/`ContextMenuLabel`/`ContextMenuSub` children. */
defineSlots<{ default?: () => unknown }>();

const root = CONTEXT_MENU_KEY.useRequired();

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

// The side and alignment the panel was ACTUALLY placed on — the requested
// ones until `computePosition` flips or clamps them away from a viewport
// edge. Seeded by the composable with the REQUESTED values rather than a
// hardcoded "bottom", so an un-flipped open never depends on a placement
// callback having fired first. This is the panel where a flip is routine
// rather than exceptional: the anchor is a point at the pointer, and a
// right-click anywhere in the lower or right band of the viewport flips it.
// Growing from the corner nearest that point is what keeps the menu feeling
// attached to the click instead of erupting from its own middle. The
// cross-axis alignment differs from the requested one whenever clamping slid
// the panel along that axis — near a viewport edge the requested corner is no
// longer the one touching the anchor, and an entrance grown from it would
// expand from the far corner instead. The source kept this in two `$state`
// locals fed by `onPlacement`.
//
// `recomputeKey` carries the pointer coordinates. The anchor is one span kept
// mounted for the root's whole life, so a second right-click while the menu is
// open — the normal path, since the pointerdown dismisses and the
// `contextmenu` event then reopens the still-mounted panel mid-exit — moves
// that span without changing which ELEMENT the positioner is pointed at, and
// every geometry option stays put too. Without the key the panel would sit at
// the previous click's `left`/`top` until an unrelated scroll or resize fired.
// The span's new inline `left`/`top` land in the component-update pass, which
// runs before this `flush: "post"` recompute, so the rect it reads is already
// the new one. The source makes `root.point` a tracked dependency of its own
// action options for the same effect.
const placement = useAnchorPosition(panel, () => ({
	anchor: () => root.anchorRef,
	side: root.side,
	align: root.align,
	offset: root.offset,
	recomputeKey: `${root.point.x},${root.point.y}`,
}));

// `active` stays a GETTER (C-2): the layer stays ON the stack for its whole
// exit and stops being TOP of it the instant `open` flips, so a second Escape
// during the fade is neither answered again nor swallowed on its way to
// whatever sits underneath. No `exclude`: unlike a dropdown's button, this
// family's trigger is a whole region and the source excludes nothing from the
// outside-click test.
useDismissable(panel, () => ({
	onDismiss: () => root.close(),
	active: () => root.open,
}));

// The source's getter object, ported verbatim in shape and built once in
// `setup`.
//
// text-[12px]: this family's own density, distinct from DropdownMenu's 13px —
// the mockup specifies both explicitly. Every shared item leaf inherits this
// from here via normal CSS (they carry no font-size of their own); a nested
// `ContextMenuSubContent` gets it forwarded through
// `menuContext.itemTextClass` instead, since a portalled submenu is a DOM
// sibling of this panel once open, not a descendant, and can't inherit it
// directly — see `MenuContext.itemTextClass`'s own doc.
const menuContext: MenuContext = {
	get focus() {
		return focus;
	},
	itemTextClass: "text-[12px]",
	get rootOpen() {
		return root.open;
	},
	get sound() {
		return root.sound;
	},
	closeAll(options) {
		// Closing the root unmounts this whole subtree — every nested
		// `ContextMenuSub`/`ContextMenuSubContent` goes with it, so there is
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
// (now-populated) core to move to an edge, exactly as the source's `tick()`
// does.
function focusFirstItem(): void {
	if (!root.open || !presence.mounted) return;
	void nextTick().then(() => focus.moveToEdge("first"));
}

// The source's effect runs on MOUNT as well as on every later change, so a
// menu whose root is already `open` on its very first render focuses its first
// item too. A `watch` without `immediate` only ever fires on a CHANGE, and
// `presence.mounted` is seeded from `open`, so neither source moves in that
// case and nothing would fire at all. `onMounted` is the initial run, and it
// is also the only phase that is honestly unavailable to a server render —
// `immediate: true` would execute the callback synchronously in `setup`, which
// PORTING.md rules out for exactly that reason.
onMounted(focusFirstItem);

// `presence.mounted` is watched alongside `open`: it flips one pass later than
// `open` and it is that pass which actually creates the items.
watch([() => root.open, () => presence.mounted], focusFirstItem, { flush: "post" });

function handleKeydown(event: KeyboardEvent): void {
	handleMenuContentKeydown(event, menuContext, {
		onTab: () => root.close({ returnFocus: false }),
	});
}

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away.
//
// ONE bidirectional leg, never a split enter/exit pair: the presence clock
// owns both directions, so a menu reopened mid-exit continues from where it is
// instead of snapping to invisible first. `entering` is what tells the
// transition which way it is going, and the params are read at the instant
// each leg starts.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register(anchored, (entering) => ({ side: placement.value.side, entering }))
);

const classes = computed(() =>
	cn(
		"ft-context-menu-content flex w-max min-w-[180px] flex-col gap-[1px] rounded-[10px] border border-border bg-popover p-[5px] text-[12px] text-popover-foreground shadow-lg outline-none",
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
