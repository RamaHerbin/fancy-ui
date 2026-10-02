<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface PopoverContentProps {
	/** Additional CSS classes, merged onto the panel. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { shallowRef } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { useFocusTrap } from "../../internals/use-focus-trap.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { POPOVER_CONTEXT } from "./types.js";

/**
 * The portalled, anchored panel.
 *
 * No `role` here on purpose. A popover is a disclosure, not a dialog — it has
 * no title to hang `aria-labelledby` off (the `trigger` slot is whatever the
 * caller passed, not a documented "title"), and `role="dialog"` without an
 * accessible name is worse than no role at all. Reachability comes from the
 * focus trap (moves focus in, and returns it to the trigger the instant the
 * panel is dismissed) and from the dismiss layer, not from a landmark role.
 *
 * ONE bidirectional leg, never a split enter/exit pair: the presence clock
 * owns both directions, so a panel reopened mid-exit continues from where it
 * is instead of snapping to invisible first. `entering` is what tells the
 * transition which way it is going, and it arrives from the presence handle
 * rather than being guessed from a direction a single bidirectional leg
 * reports as "both".
 *
 * `data-state` is an ORDINARY binding: the source writes it imperatively from
 * a transition event because its scheduler skips effects inside a closing
 * branch, and a presence-mounted subtree here stays reactive for the whole
 * exit. `inert` is never written by hand either — the presence clock sets the
 * attribute on the registered node for the whole exit, so the fading panel
 * cannot be clicked or tabbed into on its way out.
 */
defineOptions({ name: "PopoverContent", inheritAttrs: false });

const { class: className } = defineProps<PopoverContentProps>();

defineSlots<{
	/** The panel's content, forwarded straight from `Popover`'s own default slot. */
	default?: () => unknown;
}>();

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher (C-1).
const panel = shallowRef<HTMLDivElement | null>(null);

// Convention C-4: exactly where the source declares its bindable `ref`.
defineExpose({ ref: panel });

// `Popover` only ever renders this component beneath its own provider, so the
// context is always present by the time this runs — there is no
// standalone-usage fallback to design for.
const ctx = POPOVER_CONTEXT.useRequired();

// DECLARED BEFORE the focus trap, and that order is load-bearing: both arm
// from post-flush watchers, which fire in declaration order. Positioning first
// means the trap's `.focus()` lands on a panel that already has coordinates;
// the other way round it would focus a `position: static` node sitting at the
// end of `document.body`, and the browser would scroll the page down to it.
// The source gets the same guarantee from its action order.
//
// The placement as ACTUALLY resolved — the requested side and align until
// `computePosition` flips or clamps them away from a viewport edge. Seeded
// with the REQUESTED values by the composable rather than a hardcoded
// "bottom"/"center", so a panel that never flips reads the right growth origin
// without depending on whether a first placement has run yet. `resolvedAlign`
// differs from the requested alignment whenever clamping slid the panel along
// the cross axis — near a viewport edge the requested corner is no longer the
// one touching the anchor, and an entrance grown from it would expand from the
// far corner instead.
const placement = useAnchorPosition(panel, () => ({
	anchor: () => ctx.triggerRef,
	side: ctx.side,
	align: ctx.align,
	offset: ctx.offset,
}));

// Returns the two functions the source hands out through `onActivate`: the
// eager return, and the re-arm. Two module-level `let`s, two handlers and an
// `onActivate` closure collapse to this one line.
const trap = useFocusTrap(panel, () => ({ returnFocus: true }));

const presence = usePresence(() => ctx.open, {
	// The two halves of the focus handshake, at the two moments the source
	// puts them: intro start → rearm, outro start → returnFocusNow.
	//
	// `returnFocusNow` at the dismiss instant is the whole point: waiting for
	// the trap's own `destroy()` would strand a keyboard user on `<body>` for
	// the whole length of the fade, because the panel is marked `inert` the
	// instant the exit starts.
	//
	// `rearm` is the other half. A popover reopened DURING its fade reverses
	// the exit instead of remounting, so the trap is never re-created: without
	// this the panel would come back interactive with focus left on the
	// trigger behind it, Tab walking the page rather than the panel, and the
	// eager return already spent for the life of the instance.
	onEnterStart: () => trap.rearm(),
	onExitStart: () => trap.returnFocusNow(),
});

// `active` stays a GETTER (C-2). The layer stays ON the stack for its whole
// exit and stops being TOP of it the instant `open` flips, so a second Escape
// during the fade is neither answered again nor swallowed on its way to
// whatever sits underneath.
useDismissable(panel, () => ({
	onDismiss: ctx.close,
	escape: ctx.dismissible,
	outsideClick: ctx.dismissible,
	exclude: () => [ctx.triggerRef],
	active: () => ctx.open,
}));

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
		anchoring, trap and dismiss watchers run — which is what the source's
		portal-before-focus-trap action ordering buys there. A closed panel emits
		nothing at all, on the server included.

		`data-align` publishes the REQUESTED alignment, exactly as the source
		does; only the transform origin follows the resolved one.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="panelRef"
				:id="ctx.contentId"
				:class="
					cn(
						'ft-popover-content flex w-max flex-col gap-[6px] rounded-[10px] border border-border bg-popover px-[14px] py-[12px] text-[12px] text-popover-foreground shadow-lg outline-none',
						className
					)
				"
				:data-state="presence.surfaceState"
				:data-side="placement.side"
				:data-align="ctx.align"
				:style="{ transformOrigin: originFor(placement.side, placement.align) }"
			>
				<slot />
			</div>
		</Portal>
	</template>
</template>
