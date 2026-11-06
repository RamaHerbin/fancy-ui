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
import { computed, ref, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { CARD3D_CONTEXT } from "./context.js";

defineOptions({ name: "CardContainer", inheritAttrs: false });

const { class: className = "", containerClass = "" } = defineProps<CardContainerProps>();

defineSlots<{ default?(): unknown }>();

const containerRef = useTemplateRef<HTMLDivElement>("containerRef");
const pointerInside = ref(false);
const focusInside = ref(false);
const isMouseEntered = computed(() => pointerInside.value || focusInside.value);

CARD3D_CONTEXT.provide(() => isMouseEntered.value);

// Touch pointers never tilt: only a mouse or pen steers the card.
const steers = (e: PointerEvent) => e.pointerType !== "touch";

function handlePointerMove(e: PointerEvent) {
	const el = containerRef.value;
	if (!el || !steers(e)) return;
	const { left, top, width, height } = el.getBoundingClientRect();
	const x = (e.clientX - left - width / 2) / 25;
	const y = (e.clientY - top - height / 2) / 25;
	el.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
}

function handlePointerEnter(e: PointerEvent) {
	if (!steers(e)) return;
	pointerInside.value = true;
}

function handlePointerLeave(e: PointerEvent) {
	const el = containerRef.value;
	if (!el || !steers(e)) return;
	pointerInside.value = false;
	el.style.transform = `rotateY(0deg) rotateX(0deg)`;
}

// Keyboard focus presents the card: its layers lift, the tilt stays neutral.
function handleFocusIn(e: FocusEvent) {
	const target = e.target as Element | null;
	let visible = true;
	try {
		visible = !!target?.matches(":focus-visible");
	} catch {
		/* selector unsupported: treat as visible */
	}
	if (!visible) return;
	focusInside.value = true;
	const el = containerRef.value;
	if (el) el.style.transform = `rotateY(0deg) rotateX(0deg)`;
}

function handleFocusOut(e: FocusEvent) {
	if (containerRef.value?.contains(e.relatedTarget as Node | null)) return;
	focusInside.value = false;
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
					'relative flex items-center justify-center ease-linear motion-safe:transition-all motion-safe:duration-200',
					className
				)
			"
			style="transform-style: preserve-3d"
			@pointerenter="handlePointerEnter"
			@pointermove="handlePointerMove"
			@pointerleave="handlePointerLeave"
			@focusin="handleFocusIn"
			@focusout="handleFocusOut"
		>
			<slot />
		</div>
	</div>
</template>
