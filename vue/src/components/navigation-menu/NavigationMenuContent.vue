<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface NavigationMenuContentProps {
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { NAVIGATION_MENU_KEY, NAVIGATION_MENU_ITEM_KEY } from "./types.js";

/**
 * No `role` here on purpose, same reasoning as a popover's content: this is a
 * disclosure panel, not a dialog, and it has no title to anchor
 * `aria-labelledby` on other than the trigger it already points at.
 * Reachability comes from `aria-labelledby` + real DOM focus, not from a
 * landmark role — and deliberately *not* from a focus trap: a NavigationMenu
 * panel is not modal (see the README's "why not role=menu" section), so Tab
 * must be free to walk out of it into the rest of the page.
 *
 * The motion lives in `internals/motion/anchored.js`, shared with every other
 * floating surface. Two deliberate consequences: there are no pixels of
 * `translateY` — travel a panel can only fake, since the positioner owns
 * `left`/`top` on this same element — and the rise grows from the panel edge
 * nearest the list rather than from its own centre. Visibility never depends
 * on any of it: `presence.mounted` gates the DOM, and under reduced motion the
 * panel simply appears and disappears.
 *
 * ONE bidirectional leg, never a split enter/exit pair: the presence clock
 * owns both directions, so a panel re-opened inside its own fade continues
 * from where it is instead of snapping. That matters more here than on a
 * click-only surface — this one closes on a hover-intent timer, and a pointer
 * that wanders back onto the bar mid-close is ordinary rather than
 * exceptional.
 *
 * `data-state` is an ORDINARY binding carrying the surface vocabulary's two
 * values: the source writes it imperatively from a transition event because
 * its scheduler skips effects inside a closing branch, and a presence-mounted
 * subtree here stays reactive for the whole exit. `inert` is never written by
 * hand either — the presence clock sets the attribute on the registered node
 * for the whole exit, so a panel on its way out cannot hand out a clickable
 * link.
 *
 * `active: () => isOpen` disarms the dismiss layer the instant the panel stops
 * being the open one, so a second Escape during the fade is neither answered
 * again nor swallowed on its way to whatever sits underneath.
 *
 * Focus needs nothing: `NavigationMenu`'s own `close()` refocuses the trigger
 * from a plain function outside the mount gate, so the return lands at the
 * dismiss instant rather than at unmount — no focus-trap handle, because there
 * is no focus trap here at all (see the README).
 */
defineOptions({ name: "NavigationMenuContent", inheritAttrs: false });

const { class: className } = defineProps<NavigationMenuContentProps>();

defineSlots<{
	/** The panel's content — typically a feature tile plus a stack of `NavigationMenuLink`s. */
	default?: () => unknown;
}>();

const item = NAVIGATION_MENU_ITEM_KEY.useRequired();
const root = NAVIGATION_MENU_KEY.useRequired();

const isOpen = computed(() => root.value === item.value);

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher (C-1).
const panel = shallowRef<HTMLDivElement | null>(null);

// Convention C-4: exactly where the source declares its bindable `ref`.
defineExpose({ ref: panel });

const presence = usePresence(() => isOpen.value);

// The placement as ACTUALLY resolved. Anchored to the whole list rather than
// to a single trigger — every panel drops out of the row, start-aligned to it
// — and the growth origin follows whatever `computePosition` settled on: it
// flips the requested `"bottom"` to `"top"` for a nav sitting low in the
// viewport, and the resolved ALIGN differs from the requested one whenever
// clamping slid the panel along the cross axis, where an entrance grown from
// the requested corner would expand from the far corner instead.
const placement = useAnchorPosition(panel, () => ({
	anchor: () => root.listRef,
	side: "bottom",
	align: "start",
	offset: 6,
}));

// `active` and `exclude` stay GETTERS (C-2): the layer must stop being TOP of
// the stack the instant the panel stops being the open one, while remaining ON
// the stack for the whole exit. The trigger is excluded so a pointerdown on it
// is a toggle rather than an outside click that closes and immediately
// reopens.
useDismissable(panel, () => ({
	onDismiss: root.close,
	exclude: () => [root.getTriggerElement(item.value)],
	active: () => isOpen.value,
}));

// Only Enter/Space/ArrowDown on the trigger ever calls `requestFocus` (see
// NavigationMenuTrigger) — a hover- or click-open leaves this a no-op, and
// focus stays exactly where it already was.
//
// The node guard runs BEFORE the consume, where the source checks it after.
// The panel mounts one flush later than `isOpen` flips (the presence clock
// publishes `mounted` from its own post-flush pass), so the first run of this
// watcher still sees a null node; consuming there would spend the request on
// nothing and the focus move would be lost. Same observable behaviour, one
// guard reordered — the React port makes the identical swap.
//
// `root.pendingFocusValue` is named as a watch source because a Vue watcher's
// callback body is untracked by construction: the source subscribes to the
// pending value simply by calling `consumeFocusRequest()` inside its tracked
// effect, which is what re-runs it for a key press on a trigger whose panel is
// ALREADY open — the one case where `isOpen`, the node and the item value all
// stay put.
watch(
	[() => isOpen.value, panel, () => root.pendingFocusValue],
	([open, node]) => {
		if (!open) return;
		if (!node) return;
		if (!root.consumeFocusRequest(item.value)) return;
		const target = node.querySelector<HTMLElement>("a[href], button:not([disabled])") ?? node;
		target.focus();
	},
	{ flush: "post" }
);

// The disclosure equivalent of a trigger-side focusout handler: Tab is never
// trapped in here (see the README — a modal focus trap would break "Tab moves
// through the panel's links naturally"), so when focus leaves this panel on
// its own, have the panel that no longer has focus close itself rather than
// linger, invisible-to-the-eye-but-still-"open", off in the portal.
function handleFocusOut(event: FocusEvent) {
	const next = event.relatedTarget as Node | null;
	if (next && panel.value?.contains(next)) return;
	root.collapseIfOpen(item.value);
}

const classes = computed(() =>
	cn(
		"ft-navigation-menu-content bg-popover text-popover-foreground border-border grid w-[480px] grid-cols-2 gap-2 rounded-xl border p-3.5 shadow-2xl outline-none",
		className
	)
);

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register(anchored, (entering) => ({ side: placement.value.side, entering }))
);
</script>

<template>
	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it (D-V6): the
		teleport resolves its target during the patch that creates its children,
		so the panel is always connected to the document by the time the
		anchoring and dismiss watchers run. A closed panel emits nothing at all,
		on the server included.

		`data-align` reports the REQUESTED alignment, as the source does, while
		the growth origin uses the RESOLVED one.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="panelRef"
				:id="item.contentId"
				:aria-labelledby="item.triggerId"
				tabindex="-1"
				:class="classes"
				:data-state="presence.surfaceState"
				:data-side="placement.side"
				data-align="start"
				:style="{ transformOrigin: originFor(placement.side, placement.align) }"
				@pointerenter="root.cancelClose"
				@pointerleave="root.scheduleClose"
				@focusout="handleFocusOut"
			>
				<slot />
			</div>
		</Portal>
	</template>
</template>

<style scoped>
/*
 * `--ft-nav-accent` lives here, not on `NavigationMenu`'s own `<nav>`: the
 * panel is moved out to `document.body` by the portal, which severs the DOM
 * ancestry a CSS custom property would otherwise inherit through — a
 * declaration up on `<nav>` would simply never reach anything rendered in
 * here. This is the one read/declare site for the whole compound; a
 * `NavigationMenuLink` used as the mockup's feature tile
 * (`class="ft-navigation-menu-feature"`, see that component's own `<style>`)
 * reads it back through ordinary inheritance, since it always renders as a
 * descendant of this element even after the portal moves the pair of them
 * together.
 */
.ft-navigation-menu-content {
	--ft-nav-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}
</style>
