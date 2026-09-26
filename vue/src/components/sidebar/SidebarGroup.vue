<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface SidebarGroupProps {
	/** The section heading, e.g. `"General"`. Required — read by `aria-labelledby`, not decorative. */
	label: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject } from "vue";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { SIDEBAR_KEY, type SidebarContext } from "./types.js";

defineOptions({ name: "SidebarGroup", inheritAttrs: false });

const { label, class: className } = defineProps<SidebarGroupProps>();

defineSlots<{
	/** The `SidebarItem`s in this section. */
	default?(): unknown;
}>();

// `undefined` outside a Sidebar: the group still renders correctly, just
// never in the icon-only collapsed presentation.
const sidebar = inject<SidebarContext | undefined>(SIDEBAR_KEY, undefined);
const collapsed = computed(() => sidebar?.collapsed ?? false);

// SSR-stable — `uid()` throws outside the browser, and this id has to
// exist on the very first server-rendered markup for `aria-labelledby`
// to point at something real.
const headingId = useFancyId();
</script>

<template>
	<div :class="cn('ft-sidebar-group flex w-full flex-col gap-0.5', className)">
		<span
			:id="headingId"
			:class="
				cn(
					'text-muted-foreground/70 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase',
					collapsed && 'sr-only'
				)
			"
		>
			{{ label }}
		</span>
		<ul class="m-0 flex list-none flex-col gap-0.5 p-0" :aria-labelledby="headingId">
			<slot />
		</ul>
	</div>
</template>
