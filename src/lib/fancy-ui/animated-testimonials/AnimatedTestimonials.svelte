<script lang="ts" module>
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
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";

	let {
		testimonials,
		autoplay = false,
		interval = 5000,
		class: className,
	}: AnimatedTestimonialsProps = $props();

	let activeIndex = $state(0);
	let direction = $state<"next" | "prev">("next");
	let isAnimating = $state(false);
	let autoplayTimer: ReturnType<typeof setInterval> | null = null;

	function navigate(dir: "next" | "prev") {
		if (isAnimating) return;
		direction = dir;
		isAnimating = true;
		setTimeout(() => {
			activeIndex =
				dir === "next"
					? (activeIndex + 1) % testimonials.length
					: (activeIndex - 1 + testimonials.length) % testimonials.length;
			isAnimating = false;
		}, 300);
	}

	function startAutoplay() {
		if (!autoplay) return;
		autoplayTimer = setInterval(() => navigate("next"), interval);
	}

	function stopAutoplay() {
		if (autoplayTimer) {
			clearInterval(autoplayTimer);
			autoplayTimer = null;
		}
	}

	onMount(() => {
		startAutoplay();
		return () => stopAutoplay();
	});

	let activeTestimonial = $derived(testimonials[activeIndex]);
</script>

<div
	class={cn("relative mx-auto max-w-sm md:max-w-4xl antialiased font-sans px-4 md:px-8 lg:px-12 py-20", className)}
	onmouseenter={stopAutoplay}
	onmouseleave={startAutoplay}
	role="region"
	aria-label="Testimonials"
>
	<div class="relative grid grid-cols-1 gap-20 md:grid-cols-2">
		<!-- Image column -->
		<div class="relative h-80 w-full">
			{#each testimonials as testimonial, index}
				<div
					class={cn(
						"absolute inset-0 h-full w-full origin-bottom rounded-3xl transition-all duration-500 ease-in-out",
						index === activeIndex
							? "z-20 opacity-100 scale-100 translate-y-0 rotate-0"
							: "z-10 opacity-0 scale-95 translate-y-4",
						index !== activeIndex && direction === "next"
							? "-translate-y-4"
							: index !== activeIndex
								? "translate-y-4"
								: ""
					)}
				>
					<img
						src={testimonial.src}
						alt={testimonial.name}
						class="h-full w-full rounded-3xl object-cover object-center"
						draggable="false"
					/>
				</div>
			{/each}
		</div>

		<!-- Content column -->
		<div class="flex flex-col justify-between py-4">
			<div
				class={cn(
					"transition-all duration-300 ease-in-out",
					isAnimating
						? direction === "next"
							? "opacity-0 translate-y-4"
							: "opacity-0 -translate-y-4"
						: "opacity-100 translate-y-0"
				)}
			>
				<p
					class="text-lg text-gray-500 dark:text-neutral-300"
					aria-live="polite"
				>
					{activeTestimonial.quote}
				</p>
				<div class="mt-8">
					<p class="text-base font-bold text-gray-900 dark:text-white">
						{activeTestimonial.name}
					</p>
					<p class="text-sm text-gray-500 dark:text-neutral-400">
						{activeTestimonial.designation}
					</p>
				</div>
			</div>

			<!-- Navigation -->
			<div class="mt-8 flex gap-4">
				<button
					onclick={() => navigate("prev")}
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
					onclick={() => navigate("next")}
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
