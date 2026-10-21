<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface CollapsibleTriggerProps {
	/** Disables this trigger on top of the root's own `disabled`. */
	disabled?: boolean;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
	/** Called after the component's own handling, never while disabled. */
	onClick?: ((event: MouseEvent) => void) | ((event: MouseEvent) => void)[];
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { callListener } from "../../internals/call-listener.js";
import { cn } from "../../utils.js";
import { COLLAPSIBLE_KEY } from "./types.js";

defineOptions({ name: "CollapsibleTrigger", inheritAttrs: false });

const attrs = useAttrs();

const { disabled = false, class: className, onClick } = defineProps<CollapsibleTriggerProps>();

defineSlots<{ default?(): unknown }>();

const el = useTemplateRef<HTMLButtonElement>("el");
defineExpose({ ref: el });

// Undefined outside a Collapsible: the trigger then has nothing to toggle and
// renders as a plain button rather than throwing.
const context = COLLAPSIBLE_KEY.useOptional();

const isDisabled = computed(() => disabled || (context?.disabled ?? false));
const isOpen = computed(() => context?.open ?? false);

// Every attribute and listener that is not a declared prop lands on the
// button, bound BEFORE the attributes this component manages so a consumer can
// add to them but never break them. `onClick` is a declared prop, so it runs
// once through the guard in `handleClick`; the modified forms (`@click.once`,
// `.capture`) compile to `onClickOnce` and the like and would bind straight to
// the element past that guard, so they are dropped while the trigger is inert.
//
// A plain function called from the template, never a `computed`: the
// `useAttrs()` proxy only tracks on a property GET, so a derived value built
// while `attrs` was empty would never see an attribute the parent adds later.
function forwarded() {
	if (!isDisabled.value) return attrs;
	return Object.fromEntries(Object.entries(attrs).filter(([key]) => !/^onClick/.test(key)));
}

// The native `disabled` attribute is the real gate, but a synthetic click fired
// straight at the element walks past it, so the handler repeats the guard. A
// guarded click reaches neither the toggle nor the consumer.
function handleClick(event: MouseEvent) {
	if (isDisabled.value) return;
	context?.toggle();
	callListener(onClick, event);
}
</script>

<template>
	<button
		ref="el"
		@click="handleClick"
		v-bind="forwarded()"
		type="button"
		:id="context?.triggerId ?? (attrs.id as string | undefined)"
		:class="
			cn(
				'ft-collapsible-trigger cursor-pointer',
				'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
				'disabled:cursor-not-allowed disabled:opacity-50',
				className
			)
		"
		:disabled="isDisabled"
		:aria-expanded="
			context ? isOpen : (attrs['aria-expanded'] as boolean | 'true' | 'false' | undefined)
		"
		:aria-controls="context?.contentId ?? (attrs['aria-controls'] as string | undefined)"
		:data-state="context ? (isOpen ? 'open' : 'closed') : undefined"
		:data-disabled="isDisabled ? '' : undefined"
	>
		<slot />
	</button>
</template>
