<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * One item in a `Dock`, sized from its distance to the pointer.
 *
 * The width is computed from a template ref, which is `null` on the server and
 * through the first client render: until the element exists the distance is
 * `Infinity` and the icon renders at its resting 40px — which is also the size
 * it has at mount, with the pointer still at `Infinity`, so nothing moves when
 * the ref lands.
 */
export interface DockIconProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useDockContext } from "./types.js";

defineOptions({ name: "DockIcon", inheritAttrs: false });

const { class: className = "" } = defineProps<DockIconProps>();

const context = useDockContext();

const iconRef = useTemplateRef<HTMLDivElement>("iconRef");

function calculateDistance(): number {
	if (!iconRef.value) return Infinity;

	const bounds = iconRef.value.getBoundingClientRect();

	if (context.orientation === "vertical") {
		return context.mouseY.current - bounds.y - bounds.height / 2;
	}

	return context.mouseX.current - bounds.x - bounds.width / 2;
}

const iconWidth = computed(() => {
	// Checked before `calculateDistance()`, not after: on a touch device or
	// under reduced motion this also skips a `getBoundingClientRect()` per
	// icon per frame, which is the whole reason the flag is read here rather
	// than only in the pointer handler.
	if (!context.magnify) return 40;

	const distanceCalc = calculateDistance();

	if (!context.distance || !context.magnification) return 40;

	if (Math.abs(distanceCalc) < context.distance) {
		return (1 - Math.abs(distanceCalc) / context.distance) * context.magnification + 40;
	}

	return 40;
});
</script>

<template>
	<div
		ref="iconRef"
		:class="[
			'flex aspect-square cursor-pointer items-center justify-center rounded-full transition-all duration-200 ease-out',
			className,
		]"
		:style="{ width: `${iconWidth}px`, height: `${iconWidth}px` }"
	>
		<slot />
	</div>
</template>
