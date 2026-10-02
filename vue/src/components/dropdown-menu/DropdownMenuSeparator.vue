<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface DropdownMenuSeparatorProps {
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed } from "vue";

import { cn } from "../../utils.js";

/** Not a menuitem, never registered with the menu-focus core: purely a visual/semantic divider. */
defineOptions({ name: "DropdownMenuSeparator", inheritAttrs: false });

const { class: className } = defineProps<DropdownMenuSeparatorProps>();

const classes = computed(() =>
	cn("ft-dropdown-menu-separator bg-border my-[4px] h-px", className)
);
</script>

<template>
	<div role="separator" :class="classes"></div>
</template>
