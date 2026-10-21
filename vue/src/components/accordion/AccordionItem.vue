<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface AccordionItemProps {
	/** This item's value: what `Accordion`'s `value` holds while it is open. */
	value: string;
	/** Disables just this item. Its trigger is skipped by the arrow keys. */
	disabled?: boolean;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { COLLAPSIBLE_KEY, type CollapsibleContext } from "../collapsible/types.js";
import { ACCORDION_ITEM_KEY, ACCORDION_KEY, type AccordionItemContext } from "./types.js";

defineOptions({ name: "AccordionItem", inheritAttrs: false });

const attrs = useAttrs();

const { value, disabled = false, class: className } = defineProps<AccordionItemProps>();

defineSlots<{ default?(): unknown }>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// Undefined outside an Accordion: the item then behaves as a closed,
// standalone collapsible instead of throwing.
const root = ACCORDION_KEY.useOptional();

const isOpen = computed(() => root?.isOpen(value) ?? false);
const isDisabled = computed(() => (root?.disabled ?? false) || disabled);

const itemContext: AccordionItemContext = {
	get value() {
		return value;
	},
	get disabled() {
		return isDisabled.value;
	},
};

// An item is a collapsible whose open state belongs to the accordion: the
// trigger and the region below it read this exactly as they would a
// `Collapsible` root's.
const collapsible: CollapsibleContext = {
	get open() {
		return isOpen.value;
	},
	get disabled() {
		return isDisabled.value;
	},
	toggle() {
		if (isDisabled.value) return;
		root?.toggle(value);
	},
	get triggerId() {
		return root?.triggerId(value) ?? `ft-accordion-trigger-${value}`;
	},
	get contentId() {
		return root?.contentId(value) ?? `ft-accordion-content-${value}`;
	},
};

ACCORDION_ITEM_KEY.provide(itemContext);
COLLAPSIBLE_KEY.provide(collapsible);
</script>

<template>
	<div
		ref="el"
		v-bind="attrs"
		:class="cn('ft-accordion-item border-border border-b', className)"
		:data-state="isOpen ? 'open' : 'closed'"
		:data-orientation="root?.orientation ?? 'vertical'"
		:data-disabled="isDisabled ? '' : undefined"
	>
		<slot />
	</div>
</template>
