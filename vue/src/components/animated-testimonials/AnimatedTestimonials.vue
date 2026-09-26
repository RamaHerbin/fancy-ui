<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * AnimatedTestimonials - Animated testimonial carousel
 *
 * Cycles through testimonials with smooth slide animations.
 * Supports manual navigation and optional autoplay.
 */
export interface Testimonial {
	/** The testimonial quote */
	quote: string;
	/** Author's full name */
	name: string;
	/** Author's title or role */
	designation: string;
	/** URL to author's avatar image */
	src: string;
}

export interface AnimatedTestimonialsProps {
	/** Array of testimonials to display */
	testimonials: Testimonial[];
	/** Auto-advance testimonials */
	autoplay?: boolean;
	/** Interval between auto-advances (ms) */
	interval?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/** Duration must match the CSS transition duration below */
const TRANSITION_DURATION = 300;
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "AnimatedTestimonials", inheritAttrs: false });

const {
	testimonials,
	autoplay = false,
	interval = 5000,
	class: className,
	sound = false,
} = defineProps<AnimatedTestimonialsProps>();

const playCue = useSoundCue(() => sound);

const activeIndex = ref(0);
const direction = ref<"next" | "prev">("next");
const isAnimating = ref(false);
const isHovered = ref(false);

let navigateTimer: ReturnType<typeof setTimeout> | null = null;

function navigate(dir: "next" | "prev", fromUser = false) {
	if (isAnimating.value || testimonials.length === 0) return;
	if (sound && fromUser && testimonials.length > 1) playCue("select");
	direction.value = dir;
	isAnimating.value = true;
	navigateTimer = setTimeout(() => {
		activeIndex.value =
			dir === "next"
				? (activeIndex.value + 1) % testimonials.length
				: (activeIndex.value - 1 + testimonials.length) % testimonials.length;
		isAnimating.value = false;
		navigateTimer = null;
	}, TRANSITION_DURATION);
}

// Reactive autoplay: restarts whenever autoplay, interval, hover state or the
// testimonials prop changes. Registered from onMounted, so the first run never
// happens during a server render — no cleanup hook runs there, and an interval
// scheduled on the server would never be cleared.
onMounted(() => {
	watch(
		[
			() => autoplay,
			() => isHovered.value,
			() => interval,
			() => testimonials,
			() => testimonials.length,
		],
		(_v, _o, onCleanup) => {
			if (!autoplay || isHovered.value || testimonials.length === 0) return;

			const timer = setInterval(() => navigate("next"), interval);
			onCleanup(() => clearInterval(timer));
		},
		{ flush: "post", immediate: true }
	);
});

// Cleanup navigate timeout on destroy
onBeforeUnmount(() => {
	if (navigateTimer) clearTimeout(navigateTimer);
});

const activeTestimonial = computed(() =>
	testimonials.length > 0 ? testimonials[activeIndex.value] : null
);
</script>

<template>
	<div
		:class="
			cn(
				'relative mx-auto max-w-sm px-4 py-20 font-sans antialiased md:max-w-4xl md:px-8 lg:px-12',
				className
			)
		"
		@mouseenter="isHovered = true"
		@mouseleave="isHovered = false"
		role="region"
		aria-label="Testimonials"
	>
		<p v-if="testimonials.length === 0" class="text-muted-foreground text-center">
			No testimonials available.
		</p>
		<div v-else class="relative grid grid-cols-1 gap-20 md:grid-cols-2">
			<!-- Image column -->
			<div class="relative h-80 w-full">
				<div
					v-for="(testimonial, index) in testimonials"
					:key="index"
					:class="
						cn(
							'absolute inset-0 h-full w-full origin-bottom rounded-3xl transition-all ease-in-out',
							index === activeIndex
								? 'z-20 translate-y-0 scale-100 rotate-0 opacity-100'
								: 'z-10 translate-y-4 scale-95 opacity-0',
							index !== activeIndex && direction === 'next'
								? '-translate-y-4'
								: index !== activeIndex
									? 'translate-y-4'
									: ''
						)
					"
					:style="`transition-duration: ${TRANSITION_DURATION}ms`"
				>
					<img
						:src="testimonial.src"
						:alt="testimonial.name"
						class="h-full w-full rounded-3xl object-cover object-center"
						draggable="false"
					/>
				</div>
			</div>

			<!-- Content column -->
			<div class="flex flex-col justify-between py-4">
				<div
					:class="
						cn(
							'ease-in-out',
							isAnimating
								? direction === 'next'
									? 'translate-y-4 opacity-0'
									: '-translate-y-4 opacity-0'
								: 'translate-y-0 opacity-100'
						)
					"
					:style="`transition: opacity ${TRANSITION_DURATION}ms, transform ${TRANSITION_DURATION}ms`"
				>
					<p class="text-lg text-gray-500 dark:text-neutral-300" aria-live="polite">
						{{ activeTestimonial?.quote }}
					</p>
					<div class="mt-8">
						<p class="text-base font-bold text-gray-900 dark:text-white">
							{{ activeTestimonial?.name }}
						</p>
						<p class="text-sm text-gray-500 dark:text-neutral-400">
							{{ activeTestimonial?.designation }}
						</p>
					</div>
				</div>

				<!-- Navigation -->
				<div class="mt-8 flex gap-4">
					<button
						type="button"
						@click="navigate('prev', true)"
						class="group/button flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
						aria-label="Previous testimonial"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-gray-800 transition-transform group-hover/button:-translate-x-0.5 dark:text-neutral-200"
						>
							<path d="m15 18-6-6 6-6" />
						</svg>
					</button>
					<button
						type="button"
						@click="navigate('next', true)"
						class="group/button flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
						aria-label="Next testimonial"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-gray-800 transition-transform group-hover/button:translate-x-0.5 dark:text-neutral-200"
						>
							<path d="m9 18 6-6-6-6" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
