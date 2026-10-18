<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { Side, Align } from "../../internals/anchor-position.js";

export interface HoverCardProps {
	/** Whether the card is open. Two-way through `v-model:open`. */
	open?: boolean;
	/** Fires whenever the open state changes, from any trigger — pointer, focus, Escape or an outside click. */
	onOpenChange?: (open: boolean) => void;
	/** Side of the trigger the card opens on. Flips to the opposite side when it would overflow the viewport. */
	side?: Side;
	/** Alignment along the trigger's cross axis. */
	align?: Align;
	/** Gap in pixels between the trigger and the card. */
	offset?: number;
	/** Delay in ms before the card opens after the pointer enters the trigger. Ignored for focus, which opens immediately. */
	openDelay?: number;
	/**
	 * Delay in ms before the card closes after the pointer leaves the trigger
	 * or the card. Gives the pointer time to travel from one to the other
	 * without the card vanishing mid-trip. Ignored for blur, which closes
	 * immediately.
	 */
	closeDelay?: number;
	/** Additional classes for the card panel. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useFancyId } from "../../internals/use-id.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";

defineOptions({ name: "HoverCard", inheritAttrs: false });

const {
	onOpenChange,
	side = "bottom",
	align = "center",
	offset = 8,
	openDelay = 300,
	closeDelay = 150,
	class: className,
} = defineProps<HoverCardProps>();

// The counterpart of the source's bindable `open`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening.
const open = defineModel<boolean>("open", { default: false });

defineSlots<{
	/**
	 * The element that opens the card on hover or focus. Receives the card's
	 * id (or `undefined` while closed) as `descriptionId` — put it on your own
	 * trigger element's `aria-describedby` yourself. HoverCard cannot do this
	 * for you: the wrapper it renders around this slot has no accessible role
	 * of its own, so an attribute set there would not be picked up for
	 * whatever focusable element you render inside it.
	 */
	trigger?(props: { descriptionId: string | undefined }): unknown;
	/**
	 * The card's content. Supplementary only — nothing inside should be the
	 * only way to reach information or an action. See the README before
	 * putting links or buttons in here.
	 */
	default?(): unknown;
}>();

// One id, stable across SSR and hydration — `uid()` would throw on the
// server (see internals/id.ts), and this needs to exist before the card
// ever opens so the trigger's aria-describedby always resolves to a real
// element the moment it points at one.
const panelId = useFancyId();

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

function setOpen(next: boolean) {
	clearOpenTimer();
	clearCloseTimer();
	if (open.value === next) return;
	open.value = next;
	onOpenChange?.(next);
}

function scheduleOpen() {
	// A pointer arriving back on the trigger while a close is pending (it
	// travelled trigger → card → trigger) must cancel that close rather
	// than restart the open delay — the card never actually closed.
	clearCloseTimer();
	if (open.value) return;
	clearOpenTimer();
	openTimer = setTimeout(() => setOpen(true), openDelay);
}

// Called when the pointer leaves the trigger AND when it leaves the card.
// The delay is what lets it cross the gap between the two: if it lands on
// the other one before this fires, that element's own pointerenter clears
// the timer first.
function scheduleClose() {
	clearOpenTimer();
	if (!open.value) return;
	clearCloseTimer();
	closeTimer = setTimeout(() => setOpen(false), closeDelay);
}

// The source's `onMount` teardown: both timers die with the component.
// `onBeforeUnmount`, never `onUnmounted` — the DOM is still attached, which
// is where an action's `destroy` runs.
onMounted(() => {
	onBeforeUnmount(() => {
		clearOpenTimer();
		clearCloseTimer();
	});
});

// The trigger wrapper, published on the instance rather than through a prop:
// `ref` is a reserved vnode key (convention C-4), and this is the node the
// source's bindable `ref` pointed at.
const triggerEl = useTemplateRef<HTMLDivElement>("triggerEl");
defineExpose({ ref: triggerEl });

// A plain sink rather than `useTemplateRef`: the panel arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher (C-1).
const panel = shallowRef<HTMLDivElement | null>(null);

// The mount clock. It keeps the panel on screen for the length of its exit —
// the job the source's `{#if open}` branch plus outro did — and sets `inert`
// on the registered node for that whole window, which is what stops the
// pointer interacting with a card it has already left.
const presence = usePresence(() => open.value);

// The placement as ACTUALLY resolved — the requested side and align until
// `computePosition` flips or clamps it away from a viewport edge. Seeded with
// the REQUESTED values by the composable rather than a hardcoded
// "bottom"/"center", so a card that never flips reads the right growth origin
// without depending on whether the first placement has run yet. The composable
// returns what the source kept in two `$state` locals fed by `onPlacement`.
//
// `align` as resolved differs from the requested alignment whenever clamping
// slid the panel along that axis — near a viewport edge the requested corner is
// no longer the one touching the anchor, and an entrance grown from it would
// expand from the far corner instead.
const placement = useAnchorPosition(panel, () => ({
	anchor: () => triggerEl.value,
	side,
	align,
	offset,
}));

// Hoisted rather than spelled inline in the options getter: the dismiss
// composable watches these identities, and a fresh closure on every render
// would push the layer through an `update()` it does not need.
const handleDismiss = () => setOpen(false);
const excludeTrigger = () => [triggerEl.value];

// `active` stays a GETTER (C-2). The layer stays ON the stack for its whole
// exit and stops being TOP of it the instant `open` flips, so an Escape during
// the fade reaches whatever layer is underneath rather than being swallowed by
// a card that is leaving.
useDismissable(panel, () => ({
	onDismiss: handleDismiss,
	exclude: excludeTrigger,
	active: () => open.value,
}));

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away.
//
// ONE bidirectional leg, never a split enter/exit pair. This is the mechanism
// that earns its keep most on a hover surface: pointers change their mind, and
// a unified leg passes the in-flight counterpart's current position into the
// fresh call, so a card the pointer comes back to mid-fade continues from where
// it is instead of snapping to invisible and starting the entrance over.
// `entering` is what tells the transition which way it is going — a single
// bidirectional instance reports `"both"` and cannot tell the two apart on its
// own — and the params are read at the instant each direction starts.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register(anchored, (entering) => ({ side: placement.value.side, entering }))
);

// The documented contract is that nothing inside the card is interactive
// (see the README), so in the shape this component was designed for,
// focus never moves from the trigger into the card and this check never
// matters. It exists for the caller who ignores that contract anyway: an
// unconditional close-on-blur would unmount the card the instant Tab
// starts moving focus toward whatever they put inside it — vanishing out
// from under a keyboard user reaching for something a mouse user could
// already click freely, since a mouse click never routes through the
// trigger's focus at all. Checking `relatedTarget` against the panel is
// the standard trigger-to-content handoff: don't close if focus is
// headed into the very thing that would otherwise disappear.
function handleTriggerFocusOut(event: FocusEvent) {
	const next = event.relatedTarget as Node | null;
	if (next && panel.value?.contains(next)) return;
	setOpen(false);
}

const classes = computed(() =>
	cn(
		"ft-hover-card-panel bg-popover text-popover-foreground border-border flex w-60 flex-col gap-2.5 rounded-xl border p-3.5 shadow-[0_12px_32px_rgba(0,0,0,.5)]",
		className
	)
);
</script>

<template>
	<div
		ref="triggerEl"
		class="ft-hover-card-trigger inline-block"
		@pointerenter="scheduleOpen"
		@pointerleave="scheduleClose"
		@focusin="setOpen(true)"
		@focusout="handleTriggerFocusOut"
	>
		<slot name="trigger" :descriptionId="open ? panelId : undefined" />
	</div>

	<!--
		`closeDelay` and the exit are two different waits and both are wanted.
		`closeDelay` is the grace period the pointer gets to travel from the
		trigger to the card, spent BEFORE anything visible happens; the exit is the
		card leaving, spent after. `open` still flips at the end of the delay, so
		`onOpenChange(false)` and a caller's `v-model:open` are exactly where they
		were — only the removal now trails it by 150 ms, during which the presence
		clock marks this node `inert` so the card the pointer has already abandoned
		cannot be interacted with on its way out. The dismiss layer is disarmed at
		that same instant through `active`, so an Escape during the fade reaches
		whatever layer is underneath rather than being swallowed by a card that is
		leaving.

		The mounted gate is OUTERMOST and the portal sits INSIDE it: the teleport
		resolves its target during the patch that creates its children, so the
		panel is connected to the document by the time the anchoring and dismiss
		watchers run. A closed card emits nothing at all, on the server included.

		`data-state` is an ORDINARY binding carrying the surface vocabulary's TWO
		values. The source writes it imperatively from a transition event because
		its scheduler skips effects inside a closing branch; a presence-mounted
		subtree here stays reactive for the whole exit.

		Reduced motion needs no rule of its own: `anchored` collapses the duration
		to 0, the sampler's own falsy-duration fast path then skips
		`element.animate()` entirely, and the card appears and disappears in the
		frame it mounts and unmounts — the close is fully synchronous again. Its
		visibility never depended on the animation — the presence clock alone
		decides that — so nothing is reachable only through motion.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="panelRef"
				:id="panelId"
				:class="classes"
				:data-state="presence.surfaceState"
				:data-side="placement.side"
				:data-align="align"
				:style="{ transformOrigin: originFor(placement.side, placement.align) }"
				@pointerenter="clearCloseTimer"
				@pointerleave="scheduleClose"
			>
				<slot />
			</div>
		</Portal>
	</template>
</template>
