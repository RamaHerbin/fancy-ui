<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface SidebarFooterProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import SidebarSeparator from "./SidebarSeparator.vue";
import { SIDEBAR_KEY, type SidebarContext } from "./types.js";

defineOptions({ name: "SidebarFooter", inheritAttrs: false });

const { class: className } = defineProps<SidebarFooterProps>();

defineSlots<{
	/** A decorative avatar, shown even when the sidebar is collapsed. */
	avatar?(): unknown;
	/** The name / text next to the avatar. Moves to `sr-only` while collapsed — never removed. */
	default?(): unknown;
}>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

const sidebar = inject<SidebarContext | undefined>(SIDEBAR_KEY, undefined);
const collapsed = computed(() => sidebar?.collapsed ?? false);
</script>

<template>
	<div ref="el" :class="cn('ft-sidebar-footer mt-auto flex w-full flex-col', className)">
		<SidebarSeparator />
		<div
			:class="
				cn(
					'flex items-center gap-2.5 px-2 py-[7px] text-[12px]',
					'text-muted-foreground',
					collapsed && 'justify-center'
				)
			"
		>
			<span v-if="$slots.avatar" class="shrink-0" aria-hidden="true">
				<slot name="avatar" />
			</span>
			<span :class="cn('min-w-0 truncate', collapsed && 'sr-only')">
				<slot />
			</span>
		</div>
	</div>
</template>
