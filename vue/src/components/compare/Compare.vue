<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface CompareProps {
	firstImage?: string;
	secondImage?: string;
	firstImageAlt?: string;
	secondImageAlt?: string;
	class?: HTMLAttributes["class"];
	firstContentClass?: string;
	secondContentClass?: string;
	initialSliderPercentage?: number;
	slideMode?: "hover" | "drag";
	showHandlebar?: boolean;
	autoplay?: boolean;
	autoplayDuration?: number;
	onpercentagechange?: (percentage: number) => void;
	ondragstart?: () => void;
	ondragend?: () => void;
	onhoverenter?: () => void;
	onhoverleave?: () => void;
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import StarField from "./StarField.vue";

defineOptions({ name: "Compare", inheritAttrs: false });

const {
	firstImage = "",
	secondImage = "",
	firstImageAlt = "First image",
	secondImageAlt = "Second image",
	class: className,
	firstContentClass = "",
	secondContentClass = "",
	initialSliderPercentage = 50,
	slideMode = "hover",
	showHandlebar = true,
	autoplay = false,
	autoplayDuration = 5000,
	onpercentagechange,
	ondragstart,
	ondragend,
	onhoverenter,
	onhoverleave,
} = defineProps<CompareProps>();

defineSlots<{
	firstContent?(): unknown;
	secondContent?(): unknown;
	handle?(): unknown;
}>();

const sliderRef = useTemplateRef<HTMLDivElement>("sliderRef");
const sliderXPercent = ref(initialSliderPercentage);
const isDragging = ref(false);
const isMouseOver = ref(false);
const isInteracting = ref(false);
let autoplayRAF: number | null = null;

function startAutoplay(): void {
	if (!autoplay || isMouseOver.value || isDragging.value) return;

	const startTime = Date.now();
	function animate(): void {
		if (isMouseOver.value || isDragging.value) {
			if (autoplayRAF) cancelAnimationFrame(autoplayRAF);
			return;
		}

		const elapsedTime = Date.now() - startTime;
		const progress = (elapsedTime % (autoplayDuration * 2)) / autoplayDuration;
		const percentage = progress <= 1 ? progress * 100 : (2 - progress) * 100;

		sliderXPercent.value = percentage;
		onpercentagechange?.(percentage);
		autoplayRAF = requestAnimationFrame(animate);
	}

	animate();
}

function stopAutoplay(): void {
	if (autoplayRAF) {
		cancelAnimationFrame(autoplayRAF);
		autoplayRAF = null;
	}
}

function mouseEnterHandler(): void {
	isMouseOver.value = true;
	onhoverenter?.();
	if (autoplay) {
		stopAutoplay();
	}
}

function mouseLeaveHandler(): void {
	isMouseOver.value = false;
	isInteracting.value = false;
	onhoverleave?.();

	if (slideMode === "hover") {
		sliderXPercent.value = initialSliderPercentage;
		onpercentagechange?.(initialSliderPercentage);
	}
	if (slideMode === "drag") {
		isDragging.value = false;
	}

	if (autoplay) {
		startAutoplay();
	}
}

function handleStart(): void {
	if (slideMode === "drag") {
		isDragging.value = true;
		isInteracting.value = true;
		ondragstart?.();
		stopAutoplay();
	}
}

function handleEnd(): void {
	if (slideMode === "drag") {
		isDragging.value = false;
		isInteracting.value = false;
		ondragend?.();
		if (autoplay && !isMouseOver.value) {
			startAutoplay();
		}
	}
}

function handleMove(clientX: number): void {
	if (!sliderRef.value) return;

	if (slideMode === "hover" || (slideMode === "drag" && isDragging.value)) {
		isInteracting.value = true;
		stopAutoplay();

		const rect = sliderRef.value.getBoundingClientRect();
		const x = clientX - rect.left;
		const percent = (x / rect.width) * 100;

		requestAnimationFrame(() => {
			const newPercent = Math.max(0, Math.min(100, percent));
			sliderXPercent.value = newPercent;
			onpercentagechange?.(newPercent);
		});
	}
}

function handleMouseDown(): void {
	handleStart();
}

function handleMouseMove(e: MouseEvent): void {
	handleMove(e.clientX);
}

function handleTouchStart(): void {
	if (!autoplay) handleStart();
}

function handleTouchEnd(): void {
	if (!autoplay) handleEnd();
}

function handleTouchMove(e: TouchEvent): void {
	if (!autoplay) handleMove(e.touches[0]!.clientX);
}

// Watch for initialSliderPercentage changes
function syncInitialPercentage(): void {
	sliderXPercent.value = initialSliderPercentage;
}

watch(() => initialSliderPercentage, syncInitialPercentage, { flush: "post" });

// Watch for autoplay changes. The Svelte effect calls `animate()` synchronously,
// so it also reads `autoplayDuration` and `onpercentagechange`: both are sources
// here so a change restarts the loop the same way.
function syncAutoplay(): void {
	if (autoplay && !isMouseOver.value && !isDragging.value) {
		startAutoplay();
	} else {
		stopAutoplay();
	}
}

watch(
	[() => autoplay, isMouseOver, isDragging, () => autoplayDuration, () => onpercentagechange],
	syncAutoplay,
	{ flush: "post" }
);

onMounted(() => {
	// Neither watch is `immediate`: an immediate watch also runs during SSR
	// setup, where `Date.now()` and `requestAnimationFrame` are forbidden (and
	// absent). A Svelte `$effect` never runs on the server either, so the two
	// first runs happen here, in source order, before the `onMount` body — which
	// calls `startAutoplay()` a second time, as the Svelte source does.
	syncInitialPercentage();
	syncAutoplay();
	startAutoplay();
});

onBeforeUnmount(() => {
	stopAutoplay();
});
</script>

<template>
	<div
		ref="sliderRef"
		:class="cn('h-[400px] w-[400px] overflow-hidden', className)"
		:style="{ position: 'relative', cursor: slideMode === 'drag' ? 'grab' : 'col-resize' }"
		@mousemove="handleMouseMove"
		@mouseleave="mouseLeaveHandler"
		@mouseenter="mouseEnterHandler"
		@mousedown="handleMouseDown"
		@mouseup="handleEnd"
		@touchstart="handleTouchStart"
		@touchend="handleTouchEnd"
		@touchmove="handleTouchMove"
		role="slider"
		:aria-valuenow="sliderXPercent"
		:aria-valuemin="0"
		:aria-valuemax="100"
		tabindex="0"
	>
		<!-- Slider Line -->
		<div
			class="pointer-events-none absolute top-0 z-40 m-auto h-full w-px bg-gradient-to-b from-transparent from-5% via-indigo-500 to-transparent to-95%"
			:style="{ left: `${sliderXPercent}%` }"
		>
			<!-- Decorative Effects -->
			<div
				class="absolute top-1/2 left-0 z-20 h-full w-36 -translate-y-1/2 bg-gradient-to-r from-indigo-400 via-transparent to-transparent [mask-image:radial-gradient(100px_at_left,white,transparent)] opacity-50"
			></div>
			<div
				class="absolute top-1/2 left-0 z-10 h-1/2 w-10 -translate-y-1/2 bg-gradient-to-r from-cyan-400 via-transparent to-transparent [mask-image:radial-gradient(50px_at_left,white,transparent)] opacity-100"
			></div>
			<div
				class="absolute top-1/2 -right-10 h-3/4 w-10 -translate-y-1/2 [mask-image:radial-gradient(100px_at_left,white,transparent)]"
			>
				<StarField :stars-count="120" class="size-full" />
			</div>

			<!-- Custom Handle Slot -->
			<slot v-if="$slots.handle" name="handle"></slot>
			<div
				v-else-if="showHandlebar"
				class="pointer-events-auto absolute top-1/2 -right-2.5 z-30 flex size-5 -translate-y-1/2 cursor-grab items-center justify-center rounded-md bg-white shadow-[0px_-1px_0px_0px_#FFFFFF40]"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4 text-black"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
					/>
				</svg>
			</div>
		</div>

		<!-- First Content -->
		<div
			class="relative z-20 size-full overflow-hidden"
			:style="{ pointerEvents: isInteracting ? 'none' : 'auto' }"
		>
			<div
				:class="
					cn(
						'absolute inset-0 z-20 h-full w-full flex-shrink-0 overflow-hidden rounded-2xl select-none',
						firstContentClass
					)
				"
				:style="{ clipPath: `inset(0 ${100 - sliderXPercent}% 0 0)` }"
			>
				<slot v-if="$slots.firstContent" name="firstContent"></slot>
				<img
					v-else-if="firstImage"
					:alt="firstImageAlt"
					:src="firstImage"
					:class="
						cn(
							'absolute inset-0 z-20 h-full w-full flex-shrink-0 rounded-2xl object-cover select-none',
							firstContentClass
						)
					"
					draggable="false"
				/>
			</div>
		</div>

		<!-- Second Content -->
		<div
			:class="
				cn(
					'absolute top-0 left-0 z-[19] h-full w-full overflow-hidden rounded-2xl select-none',
					secondContentClass
				)
			"
			:style="{ pointerEvents: isInteracting ? 'none' : 'auto' }"
		>
			<slot v-if="$slots.secondContent" name="secondContent"></slot>
			<img
				v-else-if="secondImage"
				:alt="secondImageAlt"
				:src="secondImage"
				:class="cn('h-full w-full object-cover', secondContentClass)"
				draggable="false"
			/>
		</div>
	</div>
</template>
