<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface AccordionTriggerProps {
	/** The level of the heading that wraps the button, 1 to 6. Defaults to 3. */
	headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
	/** Disables this trigger on top of its item's and the accordion's `disabled`. */
	disabled?: boolean;
	/** Additional CSS classes, merged onto the button. */
	class?: HTMLAttributes["class"];
	/** Called after the component's own handling, never while disabled. */
	onKeydown?: ((event: KeyboardEvent) => void) | ((event: KeyboardEvent) => void)[];
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { callListener } from "../../internals/call-listener.js";
import { cn } from "../../utils.js";
import CollapsibleTrigger from "../collapsible/CollapsibleTrigger.vue";
import { ACCORDION_ITEM_KEY, ACCORDION_KEY } from "./types.js";

defineOptions({ name: "AccordionTrigger", inheritAttrs: false });

const attrs = useAttrs();

const {
	headingLevel = 3,
	disabled = false,
	class: className,
	onKeydown,
} = defineProps<AccordionTriggerProps>();

defineSlots<{ default?(): unknown }>();

const el = useTemplateRef<InstanceType<typeof CollapsibleTrigger>>("el");
defineExpose({
	/** The button element. */
	get ref() {
		return el.value?.ref ?? null;
	},
});

const root = ACCORDION_KEY.useOptional();
const item = ACCORDION_ITEM_KEY.useOptional();

// A single accordion that may not collapse keeps its open item open. The
// button stays focusable (so it is not `disabled`) and says so to assistive
// technology instead.
const locked = computed(() => (item && root ? root.isLocked(item.value) : false));

const isInert = computed(() => disabled || (item?.disabled ?? false));

// Consumer attributes land on the button through the collapsible trigger. The
// modified key forms (`@keydown.once` compiles to `onKeydownOnce`) would bind
// past the guard in `handleKeydown`, so they are dropped while the trigger is
// inert. A plain function called from the template, never a `computed`: the
// `useAttrs()` proxy only tracks on a property GET.
function forwarded() {
	if (!isInert.value) return attrs;
	return Object.fromEntries(Object.entries(attrs).filter(([key]) => !/^onKeydown/.test(key)));
}

// Runs the navigation first, then hands the SAME event to the consumer. A
// disabled trigger gets no key events from a real browser; the guard covers a
// synthetic one, and keeps it away from the consumer too.
function handleKeydown(event: KeyboardEvent) {
	if (isInert.value) return;
	if (root?.navigate(event.currentTarget as HTMLElement, event.key)) event.preventDefault();
	callListener(onKeydown, event);
}
</script>

<template>
	<div role="heading" :aria-level="headingLevel" class="ft-accordion-header m-0 flex">
		<CollapsibleTrigger
			ref="el"
			v-bind="forwarded()"
			:disabled="disabled"
			:class="
				cn(
					'ft-accordion-trigger flex flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-medium',
					'hover:underline',
					'[&[data-state=open]>svg]:rotate-180',
					className
				)
			"
			data-ft-accordion-trigger=""
			:aria-disabled="
				locked ? 'true' : (attrs['aria-disabled'] as boolean | 'true' | 'false' | undefined)
			"
			@keydown="handleKeydown"
		>
			<slot />
			<svg
				class="ft-accordion-chevron text-muted-foreground size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
				focusable="false"
			>
				<path d="m4 6 4 4 4-4" />
			</svg>
		</CollapsibleTrigger>
	</div>
</template>
