<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface SidebarSeparatorProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "SidebarSeparator", inheritAttrs: false });

const { class: className } = defineProps<SidebarSeparatorProps>();

const el = useTemplateRef<HTMLHRElement>("el");
defineExpose({ ref: el });

// `<hr>` is `role="separator"` implicitly — no extra ARIA needed. (The note
// lives here rather than above the tag: a leading template comment would
// make this a fragment root and the `<hr>` would stop being the element an
// attached wrapper reports.)
</script>

<template>
	<hr ref="el" :class="cn('ft-sidebar-separator border-border my-2 w-full', className)" />
</template>
