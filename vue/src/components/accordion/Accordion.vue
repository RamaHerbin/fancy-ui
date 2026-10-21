<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { AccordionOrientation, AccordionType, AccordionValue } from "./accordion-core.js";

export interface AccordionProps {
	/** `"single"` keeps one item open at a time, `"multiple"` lets any number be. Defaults to `"single"`. */
	type?: AccordionType;
	/** Called with the new value each time an item toggles. A string for `"single"`, an array for `"multiple"`. */
	onValueChange?: (value: AccordionValue) => void;
	/** With `type="single"`, lets the open item be closed again. Without it one item stays open once opened. Ignored for `"multiple"`. */
	collapsible?: boolean;
	/** Disables every item. */
	disabled?: boolean;
	/** The axis the items stack on, and which arrow-key pair moves focus. Defaults to `"vertical"`. */
	orientation?: AccordionOrientation;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import {
	canClose,
	navigationTarget,
	openValues,
	targetIndex,
	toggleItem,
	valueFor,
} from "./accordion-core.js";
import { ACCORDION_KEY, type AccordionContext } from "./types.js";

defineOptions({ name: "Accordion", inheritAttrs: false });

const attrs = useAttrs();

const {
	type = "single",
	onValueChange,
	collapsible = false,
	disabled = false,
	orientation = "vertical",
	class: className,
} = defineProps<AccordionProps>();

defineSlots<{ default?(): unknown }>();

/**
 * The open item, bindable. A string for `type="single"` (`""` when none is
 * open), a string array for `type="multiple"`.
 */
const value = defineModel<AccordionValue>("value", { default: "" });

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// SSR-stable, like every compound here: trigger and region ids must agree on
// the first server-rendered paint so `aria-controls` and `aria-labelledby` are
// right before hydration.
const uid = useFancyId();

const open = computed(() => openValues(type, value.value));

/** The enabled triggers of THIS accordion in screen order, read fresh on every key. */
function enabledTriggers(): HTMLButtonElement[] {
	const root = el.value;
	if (!root) return [];
	return Array.from(
		root.querySelectorAll<HTMLButtonElement>("[data-ft-accordion-trigger]:not(:disabled)")
	).filter((button) => button.closest("[data-ft-accordion]") === root);
}

const context: AccordionContext = {
	get type() {
		return type;
	},
	get orientation() {
		return orientation;
	},
	get disabled() {
		return disabled;
	},
	isOpen: (itemValue) => open.value.includes(itemValue),
	isLocked: (itemValue) => open.value.includes(itemValue) && !canClose(type, collapsible),
	// The only place `value` changes. A plain function, not a watcher: writing
	// `value` from one would read and write the same state in one pass and
	// fight a caller's own `v-model:value`.
	toggle(itemValue) {
		const next = toggleItem(type, collapsible, open.value, itemValue);
		if (next === null) return;
		const emitted = valueFor(type, next);
		value.value = emitted;
		onValueChange?.(emitted);
	},
	triggerId: (itemValue) => `${uid}-trigger-${itemValue}`,
	contentId: (itemValue) => `${uid}-content-${itemValue}`,
	navigate(origin, key) {
		const target = navigationTarget(orientation, key);
		if (!target) return false;
		const buttons = enabledTriggers();
		const index = targetIndex(buttons.length, buttons.indexOf(origin as HTMLButtonElement), target);
		if (index < 0) return false;
		buttons[index]?.focus();
		return true;
	},
};

ACCORDION_KEY.provide(context);
</script>

<template>
	<div
		ref="el"
		v-bind="attrs"
		:class="cn('ft-accordion w-full', className)"
		data-ft-accordion=""
		:data-orientation="orientation"
		:data-disabled="disabled ? '' : undefined"
	>
		<slot />
	</div>
</template>
