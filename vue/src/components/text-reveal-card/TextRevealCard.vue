<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface TextRevealCardProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/** Number of star dots */
	starsCount?: number;
	/** CSS classes for star dots */
	starsClass?: string;
	/**
	 * Seed forwarded to the star field (see `TextRevealStars`). Two cards on
	 * one page share a layout unless they are given different seeds.
	 * Divergence from the Svelte API, which scatters with `Math.random()`.
	 */
	starsSeed?: number;
}
</script>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import TextRevealStars from "./TextRevealStars.vue";

defineOptions({ name: "TextRevealCard", inheritAttrs: false });

const {
	class: className = "",
	starsCount = 130,
	starsClass = "",
	starsSeed,
} = defineProps<TextRevealCardProps>();

defineSlots<{
	default?(): unknown;
	text?(): unknown;
	revealText?(): unknown;
}>();

const cardRef = useTemplateRef<HTMLDivElement>("cardRef");
const widthPercentage = ref(0);
const isMouseOver = ref(false);

const rotateDeg = computed(() => (widthPercentage.value - 50) * 0.1);

function mouseMoveHandler(event: MouseEvent) {
	event.preventDefault();
	const card = cardRef.value;
	if (card) {
		const rect = card.getBoundingClientRect();
		const relativeX = event.clientX - rect.left;
		widthPercentage.value = (relativeX / rect.width) * 100;
	}
}

function mouseLeaveHandler() {
	isMouseOver.value = false;
	setTimeout(() => {
		if (!isMouseOver.value) {
			widthPercentage.value = 0;
		}
	}, 100);
}

function mouseEnterHandler() {
	isMouseOver.value = true;
}

function touchMoveHandler(event: TouchEvent) {
	event.preventDefault();
	const card = cardRef.value;
	if (card) {
		const rect = card.getBoundingClientRect();
		const relativeX = event.touches[0]!.clientX - rect.left;
		widthPercentage.value = (relativeX / rect.width) * 100;
	}
}
</script>

<template>
	<div
		ref="cardRef"
		:class="
			cn(
				'relative w-full max-w-[40rem] overflow-hidden rounded-lg border border-white/[0.08] bg-[#1d1c20] p-4 sm:p-6 md:p-8',
				className
			)
		"
		role="presentation"
		@mouseenter="mouseEnterHandler"
		@mouseleave="mouseLeaveHandler"
		@mousemove="mouseMoveHandler"
		@touchstart="mouseEnterHandler"
		@touchend="mouseLeaveHandler"
		@touchmove="touchMoveHandler"
	>
		<slot />

		<div class="relative flex h-40 items-center overflow-hidden">
			<!-- Reveal layer -->
			<div
				:style="{
					width: '100%',
					opacity: widthPercentage > 0 ? 1 : 0,
					clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
					transition: isMouseOver ? 'none' : 'all 0.4s ease-out',
				}"
				class="absolute z-20 bg-[#1d1c20] will-change-transform"
			>
				<slot name="text" />
			</div>

			<!-- Reveal line -->
			<div
				:style="{
					left: `${widthPercentage}%`,
					transform: `rotate(${rotateDeg}deg)`,
					opacity: widthPercentage > 0 ? 1 : 0,
					transition: isMouseOver ? 'none' : 'all 0.4s ease-out',
				}"
				class="absolute z-50 h-40 w-[8px] bg-gradient-to-b from-transparent via-neutral-800 to-transparent will-change-transform"
			></div>

			<!-- Background text + stars -->
			<div class="overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,white,transparent)]">
				<slot name="revealText" />
				<TextRevealStars :starsCount="starsCount" :class="starsClass" :seed="starsSeed" />
			</div>
		</div>
	</div>
</template>
