<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * ContainerScroll - Scroll-driven perspective card
 *
 * Rotates and scales a card from a tilted perspective to flat as the page
 * scrolls, while the title area translates upward.
 */
export interface ContainerScrollProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "ContainerScroll", inheritAttrs: false });

const { class: className = "" } = defineProps<ContainerScrollProps>();

defineSlots<{
	/** Title section (translates up on scroll) */
	titleContent?: () => unknown;
	/** Card content (rotates and scales on scroll) */
	cardContent?: () => unknown;
}>();

const containerRef = useTemplateRef<HTMLDivElement>("containerRef");
const isMobile = ref(false);
const scrollYProgress = ref(0);

const scaleDimensions = computed<[number, number]>(() =>
	isMobile.value ? [0.7, 0.9] : [1.05, 1]
);
const rotate = computed(() => 20 * (1 - scrollYProgress.value));
const scale = computed(
	() =>
		scaleDimensions.value[0] +
		(scaleDimensions.value[1] - scaleDimensions.value[0]) * scrollYProgress.value
);
const translateY = computed(() => -100 * scrollYProgress.value);

const titleStyle = computed(() => ({ transform: `translateY(${translateY.value}px)` }));

const cardStyle = computed(() => ({
	transform: `rotateX(${rotate.value}deg) scale(${scale.value})`,
	boxShadow:
		"0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
}));

function updateIsMobile() {
	isMobile.value = window.innerWidth <= 768;
}

function updateScroll() {
	const el = containerRef.value;
	if (!el) return;
	const rect = el.getBoundingClientRect();
	const windowHeight = window.innerHeight;
	const progress = 1 - Math.max(0, rect.bottom - window.scrollY) / windowHeight;
	scrollYProgress.value = Math.max(0, Math.min(1, progress));
}

onMounted(() => {
	updateIsMobile();
	updateScroll();

	window.addEventListener("resize", updateIsMobile);
	window.addEventListener("scroll", updateScroll, { passive: true });
	window.addEventListener("resize", updateScroll, { passive: true });

	onBeforeUnmount(() => {
		window.removeEventListener("resize", updateIsMobile);
		window.removeEventListener("scroll", updateScroll);
		window.removeEventListener("resize", updateScroll);
	});
});
</script>

<template>
	<div
		ref="containerRef"
		:class="
			cn(
				'relative flex h-[60rem] items-center justify-center p-2 md:h-[80rem] md:p-20',
				className
			)
		"
	>
		<div class="relative w-full py-10 md:py-40" style="perspective: 1000px">
			<!-- Title -->
			<div :style="titleStyle" class="mx-auto max-w-5xl text-center">
				<slot name="titleContent" />
			</div>

			<!-- Card -->
			<div
				:style="cardStyle"
				class="mx-auto -mt-12 h-[30rem] w-full max-w-5xl rounded-[30px] border-4 border-[#6C6C6C] bg-[#222222] p-2 shadow-2xl md:h-[40rem] md:p-6"
			>
				<div
					class="size-full overflow-hidden rounded-2xl bg-gray-100 md:rounded-2xl md:p-4 dark:bg-zinc-900"
				>
					<slot name="cardContent" />
				</div>
			</div>
		</div>
	</div>
</template>
