<script lang="ts">
import type { HTMLAttributes } from "vue";

/** One avatar's data: an identity, a name, a role line, and the image shown. */
export interface TooltipItem {
	id: number | string;
	name: string;
	designation: string;
	image: string;
}

export interface AnimatedTooltipProps {
	/** Array of items to display */
	items: TooltipItem[];
	/** Additional CSS classes for the container */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
/**
 * The row. It owns BOTH pieces of state the source keeps at the top of its
 * single file — the hovered item's id and the pointer's horizontal offset —
 * because both are shared by every avatar in the row, and that sharing is
 * observable: the source's `mousemove` handler is guarded by a ROW-WIDE test
 * (`hoveredIndex === null`), not a per-item one, so sweeping the pointer over
 * a neighbouring avatar while another one is the hovered/focused item rewrites
 * the shared offset and re-poses the tooltip that is still on screen. Keeping
 * the offset per avatar would quietly fix that.
 *
 * `mouseX` is read only through `pointer`'s getters, never in this template,
 * so a pointer sample does not re-render the row: only the avatar that is
 * actually drawing a tooltip depends on it.
 */
import { ref } from "vue";

import { cn } from "../../utils.js";
import AnimatedTooltipAvatar from "./AnimatedTooltipAvatar.vue";
import type { TooltipPointer } from "./AnimatedTooltipAvatar.vue";

defineOptions({ name: "AnimatedTooltip", inheritAttrs: false });

const props = defineProps<AnimatedTooltipProps>();

const hoveredIndex = ref<number | string | null>(null);
const mouseX = ref(0);

// Calculate rotation and translation based on mouse position. A getter object
// rather than two `computed`s handed down as props: the values stay tracked at
// the point they are READ (inside the hovered avatar), which is where the
// source reads them too.
const pointer: TooltipPointer = {
	get rotation() {
		return (mouseX.value / 100) * 50;
	},
	get translation() {
		return (mouseX.value / 100) * 50;
	},
};

function handleMouseEnter(event: MouseEvent, itemId: number | string): void {
	// Reset mouseX first to prevent offset from previous item
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
	const halfWidth = rect.width / 2;
	mouseX.value = event.clientX - rect.left - halfWidth;
	hoveredIndex.value = itemId;
}

function handleMouseMove(event: MouseEvent): void {
	if (hoveredIndex.value === null) return;
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
	const halfWidth = rect.width / 2;
	mouseX.value = event.clientX - rect.left - halfWidth;
}

function handleMouseLeave(): void {
	hoveredIndex.value = null;
	mouseX.value = 0;
}

function handleFocusIn(itemId: number | string): void {
	mouseX.value = 0;
	hoveredIndex.value = itemId;
}

function handleFocusOut(): void {
	hoveredIndex.value = null;
	mouseX.value = 0;
}
</script>

<template>
	<div :class="cn('flex flex-row items-center', props.class)">
		<AnimatedTooltipAvatar
			v-for="item in props.items"
			:key="item.id"
			:item="item"
			:hovered="hoveredIndex === item.id"
			:pointer="pointer"
			:on-item-mouse-enter="handleMouseEnter"
			:on-item-mouse-leave="handleMouseLeave"
			:on-item-mouse-move="handleMouseMove"
			:on-item-focus-in="handleFocusIn"
			:on-item-focus-out="handleFocusOut"
		/>
	</div>
</template>
