<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { ButtonGroupOrientation } from "./types.js";

export interface ButtonGroupProps {
	/** Stacking axis for the joined items. Defaults to a row. */
	orientation?: ButtonGroupOrientation;
	/** Accessible name for the group, exposed as `aria-label`. */
	label?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { BUTTON_GROUP_CONTEXT } from "./types.js";

defineOptions({ name: "ButtonGroup", inheritAttrs: false });

const { orientation = "horizontal", label, class: className } = defineProps<ButtonGroupProps>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

const context = {
	get orientation() {
		return orientation;
	},
};

BUTTON_GROUP_CONTEXT.provide(context);
</script>

<template>
	<div
		ref="el"
		:class="
			cn(
				'ft-button-group border-border inline-flex rounded-lg border',
				orientation === 'vertical' ? 'flex-col' : 'flex-row',
				className
			)
		"
		:data-orientation="orientation"
		role="group"
		:aria-label="label"
	>
		<slot />
	</div>
</template>

<style scoped>
/*
 * `:deep()` reaches past this component's own scoping and into whatever
 * a caller renders inside the default slot — a Button, a plain <button>,
 * an <a> — which ButtonGroup does not own and has no other way to touch.
 * That makes this one of the rare spots where `:deep()` is warranted:
 * the seam only reads as one control if every item gives up its own
 * corners and border, and only the container can reach in and say so.
 * Unlayered scoped rules beat Tailwind's layered utilities, so this wins
 * over a child's own `rounded-*` / `border` classes without `!important`.
 */
.ft-button-group :deep(> *) {
	border-style: none;
	border-radius: 0;
}

/*
 * The divider reads lighter than the container's own outer border (10%
 * vs. 14% in the mockup) — a seam between two items already in contact,
 * not an edge that has to hold its own against whatever sits outside it.
 */

/* Horizontal: a vertical hairline between items, left-to-right. */
.ft-button-group:not([data-orientation="vertical"]) :deep(> * + *) {
	border-left: 1px solid var(--color-border, color-mix(in oklab, currentColor 10%, transparent));
}

/* Vertical: the same hairline, rotated onto the stacking axis. */
.ft-button-group[data-orientation="vertical"] :deep(> * + *) {
	border-top: 1px solid var(--color-border, color-mix(in oklab, currentColor 10%, transparent));
}

/*
 * The container's own radius only ever shows at its two open ends — the
 * left edge of the first item and the right edge of the last one in a
 * row, or the top and bottom in a stack. `inherit` copies whatever radius
 * the container ends up with (including a caller's override through
 * `class`) instead of a second hardcoded value that could drift from it.
 */
.ft-button-group:not([data-orientation="vertical"]) :deep(> *:first-child) {
	border-top-left-radius: inherit;
	border-bottom-left-radius: inherit;
}

.ft-button-group:not([data-orientation="vertical"]) :deep(> *:last-child) {
	border-top-right-radius: inherit;
	border-bottom-right-radius: inherit;
}

.ft-button-group[data-orientation="vertical"] :deep(> *:first-child) {
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
}

.ft-button-group[data-orientation="vertical"] :deep(> *:last-child) {
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
}

/*
 * No `overflow: hidden` on the root: the first/last child rules above
 * already give the two open ends exactly the container's own radius, so
 * nothing ever renders outside its rounded outline that would need
 * clipping — and a clip here would have cut every item's focus ring off
 * at the container's edge along with it. What is still a real hazard is
 * a focused item's ring bleeding sideways into whichever neighbour sits
 * later in source order, whose opaque background then paints over it.
 * Lifting the focused item into its own stacking context puts the ring
 * back on top of that neighbour instead.
 */
.ft-button-group :deep(> *:focus-visible) {
	position: relative;
	z-index: 1;
}
</style>
