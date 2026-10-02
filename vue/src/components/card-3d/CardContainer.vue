<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface CardContainerProps {
	/** Classes for the inner, tilting 3d container. */
	class?: HTMLAttributes["class"];
	/** Classes for the outer perspective wrapper. */
	containerClass?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { ref, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { CARD3D_CONTEXT } from "./context.js";

defineOptions({ name: "CardContainer", inheritAttrs: false });

const { class: className = "", containerClass = "" } = defineProps<CardContainerProps>();

defineSlots<{ default?(): unknown }>();

const containerRef = useTemplateRef<HTMLDivElement>("containerRef");
const isMouseEntered = ref(false);

CARD3D_CONTEXT.provide(() => isMouseEntered.value);

function handleMouseMove(e: MouseEvent) {
	const el = containerRef.value;
	if (!el) return;
	const { left, top, width, height } = el.getBoundingClientRect();
	const x = (e.clientX - left - width / 2) / 25;
	const y = (e.clientY - top - height / 2) / 25;
	el.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
}

function handleMouseEnter() {
	isMouseEntered.value = true;
}

function handleMouseLeave() {
	const el = containerRef.value;
	if (!el) return;
	isMouseEntered.value = false;
	el.style.transform = `rotateY(0deg) rotateX(0deg)`;
}
</script>

<template>
	<div
		:class="cn('flex items-center justify-center p-2', containerClass)"
		style="perspective: 1000px"
	>
		<div
			ref="containerRef"
			:class="
				cn(
					'relative flex items-center justify-center transition-all duration-200 ease-linear',
					className
				)
			"
			style="transform-style: preserve-3d"
			@mouseenter="handleMouseEnter"
			@mousemove="handleMouseMove"
			@mouseleave="handleMouseLeave"
		>
			<slot />
		</div>
	</div>
</template>
