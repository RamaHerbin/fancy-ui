<script lang="ts">
import type { HTMLAttributes } from "vue";

/** A rule between two groups of dock icons, laid across the dock's own axis. */
export interface DockSeparatorProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";
import { useDockContext } from "./types.js";

defineOptions({ name: "DockSeparator", inheritAttrs: false });

const { class: className = "" } = defineProps<DockSeparatorProps>();

const context = useDockContext();
</script>

<template>
	<div
		:class="
			cn(
				'bg-secondary relative block',
				context.orientation === 'vertical' ? 'h-0.5 w-4/5' : 'h-4/5 w-0.5',
				className
			)
		"
	></div>
</template>
