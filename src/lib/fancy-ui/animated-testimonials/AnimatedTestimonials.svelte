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

	/** Duration must match the CSS transition duration below */
	const TRANSITION_DURATION = 300;
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		testimonials,
		autoplay = false,
		interval = 5000,
		class: className,
	}: AnimatedTestimonialsProps = $props();

	let activeIndex = $state(0);
	let direction = $state<"next" | "prev">("next");
	let isAnimating = $state(false);
	let isHovered = $state(false);

	let navigateTimer: ReturnType<typeof setTimeout> | null = null;

	function navigate(dir: "next" | "prev") {
		if (isAnimating || testimonials.length === 0) return;
		direction = dir;
		isAnimating = true;
		navigateTimer = setTimeout(() => {
			activeIndex =
				dir === "next"
					? (activeIndex + 1) % testimonials.length
					: (activeIndex - 1 + testimonials.length) % testimonials.length;
			isAnimating = false;
			navigateTimer = null;
		}, TRANSITION_DURATION);
	}

	// Reactive autoplay: restarts whenever autoplay, interval, or hover state changes
	$effect(() => {
		if (!autoplay || isHovered || testimonials.length === 0) return;

		const timer = setInterval(() => navigate("next"), interval);
		return () => clearInterval(timer);
	});

	// Cleanup navigate timeout on destroy
	$effect(() => {
		return () => {
			if (navigateTimer) clearTimeout(navigateTimer);
		};
	});

	let activeTestimonial = $derived(testimonials.length > 0 ? testimonials[activeIndex] : null);
</script>

<div
	class={cn(
		"relative mx-auto max-w-sm px-4 py-20 font-sans antialiased md:max-w-4xl md:px-8 lg:px-12",
		className
	)}
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	role="region"
	aria-label="Testimonials"
>
	{#if testimonials.length === 0}
		<p class="text-muted-foreground text-center">No testimonials available.</p>
	{:else}
		<div class="relative grid grid-cols-1 gap-20 md:grid-cols-2">
			<!-- Image column -->
			<div class="relative h-80 w-full">
				{#each testimonials as testimonial, index}
					<div
						class={cn(
							"absolute inset-0 h-full w-full origin-bottom rounded-3xl transition-all ease-in-out",
							index === activeIndex
								? "z-20 translate-y-0 scale-100 rotate-0 opacity-100"
								: "z-10 translate-y-4 scale-95 opacity-0",
							index !== activeIndex && direction === "next"
								? "-translate-y-4"
								: index !== activeIndex
									? "translate-y-4"
									: ""
						)}
						style="transition-duration: {TRANSITION_DURATION}ms"
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
						"ease-in-out",
						isAnimating
							? direction === "next"
								? "translate-y-4 opacity-0"
								: "-translate-y-4 opacity-0"
							: "translate-y-0 opacity-100"
					)}
					style="transition: opacity {TRANSITION_DURATION}ms, transform {TRANSITION_DURATION}ms"
				>
					<p class="text-lg text-gray-500 dark:text-neutral-300" aria-live="polite">
						{activeTestimonial?.quote}
					</p>
					<div class="mt-8">
						<p class="text-base font-bold text-gray-900 dark:text-white">
							{activeTestimonial?.name}
						</p>
						<p class="text-sm text-gray-500 dark:text-neutral-400">
							{activeTestimonial?.designation}
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
	{/if}
</div>
