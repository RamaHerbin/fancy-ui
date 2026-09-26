<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface DropdownMenuLabelProps {
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed } from "vue";

import { cn } from "../../utils.js";

/**
 * A group heading, not a menuitem: never registered with the menu-focus core,
 * never focusable, skipped entirely by arrow-key navigation and typeahead.
 * Real text content (not `aria-hidden`), so it still reads to assistive tech as
 * part of the menu — the same non-interactive-but-audible treatment
 * `DropdownMenuItem`'s own label gets, just without a role.
 */
defineOptions({ name: "DropdownMenuLabel", inheritAttrs: false });

const { class: className } = defineProps<DropdownMenuLabelProps>();

/** The label's text. */
defineSlots<{ default?: () => unknown }>();

const classes = computed(() =>
	cn(
		"ft-dropdown-menu-label text-muted-foreground px-[8px] py-[4px] text-[10px] font-semibold tracking-[0.08em] uppercase opacity-60",
		className
	)
);
</script>

<template>
	<div :class="classes"><slot /></div>
</template>
