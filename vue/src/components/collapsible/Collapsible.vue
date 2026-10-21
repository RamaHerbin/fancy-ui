<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface CollapsibleProps {
	/** Called with the new state each time the trigger toggles it. */
	onOpenChange?: (open: boolean) => void;
	/** Makes the trigger inert. A bound `open` can still be changed from outside. */
	disabled?: boolean;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { COLLAPSIBLE_KEY, type CollapsibleContext } from "./types.js";

defineOptions({ name: "Collapsible", inheritAttrs: false });

const attrs = useAttrs();

const { onOpenChange, disabled = false, class: className } = defineProps<CollapsibleProps>();

defineSlots<{ default?(): unknown }>();

/** Whether the content is expanded, bindable. Defaults to `false`. */
const open = defineModel<boolean>("open", { default: false });

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// SSR-stable: `internals/id.js`'s `uid()` is client-only, and the
// trigger/content ids must already agree on the first server-rendered paint so
// `aria-controls` is correct before hydration.
const uid = useFancyId();

const context: CollapsibleContext = {
	get open() {
		return open.value;
	},
	get disabled() {
		return disabled;
	},
	// The only place `open` changes from inside. A plain function, not a
	// watcher: writing `open` from one would read and write the same state in
	// one pass and fight a caller's own `v-model:open`.
	toggle() {
		if (disabled) return;
		const next = !open.value;
		open.value = next;
		onOpenChange?.(next);
	},
	triggerId: `${uid}-trigger`,
	contentId: `${uid}-content`,
};

COLLAPSIBLE_KEY.provide(context);
</script>

<template>
	<div
		ref="el"
		v-bind="attrs"
		:class="cn('ft-collapsible', className)"
		:data-state="open ? 'open' : 'closed'"
		:data-disabled="disabled ? '' : undefined"
	>
		<slot />
	</div>
</template>
