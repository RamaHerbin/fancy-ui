<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface AccordionContentProps {
	/**
	 * Keeps the children mounted while the item is closed. On by default; pass
	 * `false` to unmount them once the collapse has finished and mount them
	 * again on open. See `CollapsibleContent`.
	 */
	forceMount?: boolean;
	/** Additional CSS classes, merged onto the inner body so padding collapses with the panel. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import CollapsibleContent from "../collapsible/CollapsibleContent.vue";
import { COLLAPSIBLE_KEY } from "../collapsible/types.js";

defineOptions({ name: "AccordionContent", inheritAttrs: false });

const attrs = useAttrs();

const { forceMount = true, class: className } = defineProps<AccordionContentProps>();

defineSlots<{ default?(): unknown }>();

const el = useTemplateRef<InstanceType<typeof CollapsibleContent>>("el");
defineExpose({
	/** The region element that animates. */
	get ref() {
		return el.value?.ref ?? null;
	},
});

// The item's collapsible context names the trigger that labels this region.
const context = COLLAPSIBLE_KEY.useOptional();
</script>

<template>
	<CollapsibleContent
		ref="el"
		v-bind="attrs"
		:force-mount="forceMount"
		:class="cn('ft-accordion-content text-muted-foreground pb-4 text-sm', className)"
		role="region"
		:aria-labelledby="context?.triggerId"
	>
		<slot />
	</CollapsibleContent>
</template>
