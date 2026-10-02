<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface TimePickerPanelProps {
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
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { TIME_PICKER_CONTEXT } from "./types.js";

/**
 * `TimePicker`'s portalled listbox of slots.
 *
 * No focus trap here, unlike a dialog surface — a listbox popup is not a
 * dialog. Focus deliberately never leaves the trigger; the active row is only
 * ever communicated through `aria-activedescendant` on the button above, which
 * is why this panel carries `role="listbox"` and `role="option"` rows instead
 * of a plain menu, and why nothing here ever calls `.focus()`. A pointer
 * commit is the one path that can still strand focus, and the trigger puts it
 * back itself, inside `ctx.commit`.
 *
 * ONE bidirectional leg, never a split enter/exit pair: the presence clock owns
 * both directions, so a panel reopened mid-exit continues from where it is
 * instead of snapping to invisible first. `entering` is what tells the
 * transition which way it is going, and it arrives from the presence handle
 * rather than being guessed from a direction a single bidirectional transition
 * reports as "both".
 *
 * `TimePicker` renders this component unconditionally and the mount gate lives
 * here — this package's shape of the source's `{#if open}` one level up, which
 * is also why `open` still has to arrive through the context. `data-state` is
 * an ORDINARY binding: the source writes it imperatively from a transition
 * event because its scheduler skips effects inside a closing branch, and a
 * presence-mounted subtree here stays reactive for the whole exit. `inert` is
 * never written by hand either — the presence clock sets the attribute on the
 * registered node for the whole exit, which is exactly what stops a row taking
 * a click on its way out.
 */
defineOptions({ name: "TimePickerPanel", inheritAttrs: false });

const props = defineProps<TimePickerPanelProps>();

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher (C-1).
const panel = shallowRef<HTMLDivElement | null>(null);

// Convention C-4: exactly where the source declares its bindable `ref`.
defineExpose({ ref: panel });

// `TimePicker` only ever renders this component beneath its own provider, so
// the context is always present by the time this runs — there is no
// standalone-usage fallback to design for, the same as `SelectPanel`.
const ctx = TIME_PICKER_CONTEXT.useRequired();

const presence = usePresence(() => ctx.open);

// The side and alignment the panel was ACTUALLY placed on — the requested ones
// until `computePosition` flips or clamps them away from a viewport edge.
// Seeded with the request rather than left undefined, so the growth origin is
// already right on the first frame and only a real flip ever has to correct it.
// The composable returns what the source kept in two `$state` locals fed by
// `onPlacement`.
const placement = useAnchorPosition(panel, () => ({
	anchor: () => ctx.triggerRef,
	side: "bottom",
	align: "start",
	offset: 4,
}));

// `active` stays a GETTER (C-2). The layer stays ON the stack for its whole
// exit and stops being TOP of it the instant `open` flips, so a second Escape
// during the fade falls through to whatever is underneath.
useDismissable(panel, () => ({
	onDismiss: ctx.close,
	exclude: () => [ctx.triggerRef],
	active: () => ctx.open,
}));

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register(anchored, (entering) => ({ side: placement.value.side, entering }))
);

function rowClasses(index: number): string {
	return cn(
		"ft-time-picker-option flex cursor-pointer items-center justify-between gap-2 rounded-[6px] px-[10px] py-[6px] font-mono text-foreground select-none",
		(ctx.isSelected(index) || ctx.isActive(index)) && "bg-accent text-accent-foreground"
	);
}
</script>

<template>
	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it (D-V6): the
		teleport resolves its target during the patch that creates its children,
		so the panel is always connected to the document by the time the anchoring
		and dismiss watchers run. A closed panel emits nothing at all, on the
		server included.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="panelRef"
				:id="ctx.panelId"
				role="listbox"
				:class="
					cn(
						'ft-time-picker-panel border-border bg-popover text-popover-foreground flex max-h-[220px] w-max min-w-[100px] flex-col gap-[1px] overflow-y-auto rounded-[10px] border p-[5px] text-[12px] shadow-lg outline-none',
						props.class
					)
				"
				:data-state="presence.surfaceState"
				:data-side="placement.side"
				data-align="start"
				:style="{ transformOrigin: originFor(placement.side, placement.align) }"
			>
				<!--
					Reachable when `min`/`max` exclude every generated slot — see the
					README. A real row, not silently nothing: an empty floating panel
					with no explanation is a worse failure than this one line.
				-->
				<p
					v-if="ctx.slots.length === 0"
					class="text-muted-foreground px-[10px] py-[7px] text-[12px] italic"
				>
					No times available.
				</p>
				<!--
					`v-for` inside a `<template v-else>` rather than beside a `v-else`
					on the row itself: `v-if` outranks `v-for` on one element, so the
					two cannot share a node the way the source's `{#if}`/`{#each}` pair
					does.

					Keyboard activation for this row is not local: the trigger button
					owns every keydown (Enter/Space/arrow keys/Home/End) and drives
					selection through `aria-activedescendant`, per the ARIA
					combobox-with-listbox-popup pattern. A row-level keydown handler
					would be dead code — focus never reaches a row to fire one — not a
					missing affordance.
				-->
				<template v-else>
					<div
						v-for="(slot, index) in ctx.slots"
						:key="slot"
						:id="ctx.optionId(index)"
						role="option"
						tabindex="-1"
						:aria-selected="ctx.isSelected(index)"
						:class="rowClasses(index)"
						@click="ctx.commit(index)"
						@pointerenter="ctx.setActive(index)"
					>
						<span>{{ ctx.labelFor(slot) }}</span>
						<span
							v-if="ctx.isSelected(index)"
							aria-hidden="true"
							class="text-[var(--ft-field-accent)]"
							>✓</span
						>
					</div>
				</template>
			</div>
		</Portal>
	</template>
</template>

<style scoped>
.ft-time-picker-option {
	--ft-field-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}
</style>
