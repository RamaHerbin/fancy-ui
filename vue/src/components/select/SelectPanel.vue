<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface SelectPanelProps {
	/** Additional CSS classes, merged onto the panel. */
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
import { SELECT_CONTEXT, type SelectOption } from "./types.js";

/**
 * `Select`'s portalled listbox.
 *
 * No focus trap here, unlike a dialog surface — a combobox listbox is not a
 * dialog. Focus deliberately never leaves the trigger; the active row is only
 * ever communicated through `aria-activedescendant` on the button, which is
 * why this panel carries `role="listbox"` and `role="option"` rows instead of
 * a plain menu. Focus staying there through a mouse click specifically depends
 * on `preventFocusSteal` below, not merely on this component never calling
 * `.focus()` — see its own comment.
 *
 * ONE bidirectional leg, never a split enter/exit pair: the presence clock owns
 * both directions, so a panel reopened mid-exit continues from where it is
 * instead of snapping to invisible first. `entering` is what tells the
 * transition which way it is going, and it arrives from the presence handle
 * rather than being guessed from a direction a single bidirectional transition
 * reports as "both".
 *
 * `Select` renders this component unconditionally and the mount gate lives
 * here — this package's shape of the source's `{#if open}` one level up, which
 * is also why `open` still has to arrive through the context. `data-state` is
 * an ORDINARY binding: the source writes it imperatively from a transition
 * event because its scheduler skips effects inside a closing branch, and a
 * presence-mounted subtree here stays reactive for the whole exit. `inert` is
 * never written by hand either — the presence clock sets the attribute on the
 * registered node for the whole exit, which is exactly what a closing listbox
 * wants: the rows stop taking clicks the instant the panel starts leaving.
 */
defineOptions({ name: "SelectPanel", inheritAttrs: false });

const props = defineProps<SelectPanelProps>();

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher (C-1).
const panel = shallowRef<HTMLDivElement | null>(null);

// Convention C-4: exactly where the source declares its bindable `ref`.
defineExpose({ ref: panel });

// `Select` only ever renders this component beneath its own provider, so the
// context is always present by the time this runs.
const ctx = SELECT_CONTEXT.useRequired();

const presence = usePresence(() => ctx.open);

// The side and alignment the panel was ACTUALLY placed on — the requested ones
// until `computePosition` flips or clamps them away from a viewport edge.
// Seeded with the request rather than a hardcoded "bottom", so the common
// never-flipped case never depends on a first placement callback having fired:
// a wrong seed would be a one-frame origin jump on every open. The composable
// returns what the source kept in two `$state` locals fed by `onPlacement`.
const placement = useAnchorPosition(panel, () => ({
	anchor: () => ctx.triggerRef,
	side: ctx.side,
	align: ctx.align,
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

/**
 * What the rows render from, frozen for the length of the exit.
 *
 * The source destroys the branch that owns this component and marks it INERT
 * before playing the outro — its scheduler skips inert effects, so the rows on
 * screen during the exit are frozen at whatever they were the instant the close
 * began. A presence-mounted subtree stays reactive, so the freeze is explicit
 * here. It is load-bearing on the most common interaction there is: clicking a
 * row commits the value and flips `open` in the SAME turn, so an unfrozen panel
 * would move the ✓ and the highlight onto the clicked row and off the old one
 * for the whole 150 ms fade.
 *
 * `flush: "post"` like every other watcher in the package (§4 names the only
 * two `pre` sites in it, and neither is here). The guard is what freezes, not
 * the phase: a close never writes, so the rows keep the snapshot they had
 * whichever side of the patch the callback runs on. A change made while OPEN
 * costs one extra render job, queued from inside the same flush and drained by
 * the same loop — still before the browser paints, so nothing stale is ever on
 * screen for a frame.
 *
 * It is also why the rows below compare indices against this snapshot instead
 * of calling the context's own `isSelected`/`isActive`: those two read the live
 * state, which is exactly what must not be read during the exit. They stay on
 * the context interface — it is copied from the source — but this panel, their
 * only consumer, no longer calls them.
 */
interface PanelView {
	options: SelectOption[];
	value: string;
	activeIndex: number;
}

const view = shallowRef<PanelView>({
	options: ctx.options,
	value: ctx.value,
	activeIndex: ctx.activeIndex,
});

watch(
	() =>
		ctx.open ? { options: ctx.options, value: ctx.value, activeIndex: ctx.activeIndex } : null,
	(next) => {
		if (next) view.value = next;
	},
	{ flush: "post" }
);

const selectedIndex = computed(() =>
	view.value.options.findIndex((o) => o.value === view.value.value)
);

function rowClasses(index: number, option: SelectOption): string {
	return cn(
		"ft-select-option flex cursor-pointer items-center justify-between gap-2 rounded-[6px] px-[10px] py-[7px] text-foreground select-none",
		(index === selectedIndex.value || index === view.value.activeIndex) &&
			"bg-accent text-accent-foreground",
		option.disabled && "cursor-not-allowed opacity-50"
	);
}

function handleClick(index: number, option: SelectOption): void {
	if (option.disabled) return;
	ctx.commit(index);
}

function handlePointerEnter(index: number, option: SelectOption): void {
	if (option.disabled) return;
	ctx.setActive(index);
}

// A real mousedown on ANY element carrying a `tabindex` attribute — even
// `-1` — moves DOM focus to it as the browser's own default action,
// independent of whether application JS ever calls `.focus()` on it.
// Never calling `.focus()` ourselves is not what keeps focus on the
// trigger; cancelling that default action is. Without this, clicking a
// row focuses the row first (mousedown), the click then commits and
// closes the panel, the row is removed from the DOM, and focus falls
// through to `document.body` — the same "keep focus put" trick
// `PasswordInput`'s reveal toggle already uses on its own `mousedown`.
function preventFocusSteal(event: MouseEvent): void {
	event.preventDefault();
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
				:aria-label="ctx.label"
				:class="
					cn(
						'ft-select-panel border-border bg-popover text-popover-foreground flex w-max min-w-[160px] flex-col gap-[1px] rounded-[10px] border p-[5px] text-[13px] shadow-lg outline-none',
						props.class
					)
				"
				:data-state="presence.surfaceState"
				:data-side="placement.side"
				:data-align="ctx.align"
				:style="{ transformOrigin: originFor(placement.side, placement.align) }"
			>
				<!--
					Keyboard activation for a row is not local: the trigger button owns
					every keydown (Enter/Space/arrow keys/typeahead) and drives selection
					through `aria-activedescendant`, per the ARIA combobox-with-listbox-popup
					pattern. A row-level keydown handler would be dead code — focus never
					reaches a row to fire one — not a missing affordance.
				-->
				<div
					v-for="(option, index) in view.options"
					:key="option.value"
					:id="ctx.optionId(index)"
					role="option"
					tabindex="-1"
					:aria-selected="index === selectedIndex"
					:aria-disabled="option.disabled ? 'true' : undefined"
					:class="rowClasses(index, option)"
					@mousedown="preventFocusSteal"
					@click="handleClick(index, option)"
					@pointerenter="handlePointerEnter(index, option)"
				>
					<span class="truncate">{{ option.label }}</span>
					<span
						v-if="index === selectedIndex"
						aria-hidden="true"
						class="text-[var(--ft-field-accent)]"
						>✓</span
					>
				</div>
			</div>
		</Portal>
	</template>
</template>

<style scoped>
.ft-select-option {
	--ft-field-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}
</style>
