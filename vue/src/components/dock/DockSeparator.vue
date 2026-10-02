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

<!-- A hairline that fades out at both ends, so it reads as a seam in the
     glass rather than a bar laid on top of it. -->
<template>
	<div
		role="separator"
		:aria-orientation="context.orientation === 'vertical' ? 'horizontal' : 'vertical'"
		:class="
			cn(
				'relative z-[1] block shrink-0 self-center',
				context.orientation === 'vertical'
					? 'h-px w-4/5 bg-gradient-to-r'
					: 'h-4/5 w-px bg-gradient-to-b',
				'from-transparent via-black/15 to-transparent dark:via-white/15',
				className
			)
		"
	></div>
</template>
