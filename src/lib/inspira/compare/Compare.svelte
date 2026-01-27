<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils';
	import StarField from './StarField.svelte';

	interface Props {
		firstImage?: string;
		secondImage?: string;
		firstImageAlt?: string;
		secondImageAlt?: string;
		class?: string;
		firstContentClass?: string;
		secondContentClass?: string;
		initialSliderPercentage?: number;
		slideMode?: 'hover' | 'drag';
		showHandlebar?: boolean;
		autoplay?: boolean;
		autoplayDuration?: number;
		onpercentagechange?: (percentage: number) => void;
		ondragstart?: () => void;
		ondragend?: () => void;
		onhoverenter?: () => void;
		onhoverleave?: () => void;
		firstContent?: import('svelte').Snippet;
		secondContent?: import('svelte').Snippet;
		handle?: import('svelte').Snippet;
	}

	let {
		firstImage = '',
		secondImage = '',
		firstImageAlt = 'First image',
		secondImageAlt = 'Second image',
		class: className = '',
		firstContentClass = '',
		secondContentClass = '',
		initialSliderPercentage = 50,
		slideMode = 'hover',
		showHandlebar = true,
		autoplay = false,
		autoplayDuration = 5000,
		onpercentagechange,
		ondragstart,
		ondragend,
		onhoverenter,
		onhoverleave,
		firstContent,
		secondContent,
		handle
	}: Props = $props();

	let sliderRef: HTMLDivElement;
	let sliderXPercent = $state(initialSliderPercentage);
	let isDragging = $state(false);
	let isMouseOver = $state(false);
	let isInteracting = $state(false);
	let autoplayRAF: number | null = null;

	function startAutoplay(): void {
		if (!autoplay || isMouseOver || isDragging) return;

		const startTime = Date.now();
		function animate(): void {
			if (isMouseOver || isDragging) {
				if (autoplayRAF) cancelAnimationFrame(autoplayRAF);
				return;
			}

			const elapsedTime = Date.now() - startTime;
			const progress = (elapsedTime % (autoplayDuration * 2)) / autoplayDuration;
			const percentage = progress <= 1 ? progress * 100 : (2 - progress) * 100;

			sliderXPercent = percentage;
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
		isMouseOver = true;
		onhoverenter?.();
		if (autoplay) {
			stopAutoplay();
		}
	}

	function mouseLeaveHandler(): void {
		isMouseOver = false;
		isInteracting = false;
		onhoverleave?.();

		if (slideMode === 'hover') {
			sliderXPercent = initialSliderPercentage;
			onpercentagechange?.(initialSliderPercentage);
		}
		if (slideMode === 'drag') {
			isDragging = false;
		}

		if (autoplay) {
			startAutoplay();
		}
	}

	function handleStart(): void {
		if (slideMode === 'drag') {
			isDragging = true;
			isInteracting = true;
			ondragstart?.();
			stopAutoplay();
		}
	}

	function handleEnd(): void {
		if (slideMode === 'drag') {
			isDragging = false;
			isInteracting = false;
			ondragend?.();
			if (autoplay && !isMouseOver) {
				startAutoplay();
			}
		}
	}

	function handleMove(clientX: number): void {
		if (!sliderRef) return;

		if (slideMode === 'hover' || (slideMode === 'drag' && isDragging)) {
			isInteracting = true;
			stopAutoplay();

			const rect = sliderRef.getBoundingClientRect();
			const x = clientX - rect.left;
			const percent = (x / rect.width) * 100;

			requestAnimationFrame(() => {
				const newPercent = Math.max(0, Math.min(100, percent));
				sliderXPercent = newPercent;
				onpercentagechange?.(newPercent);
			});
		}
	}

	function handleMouseDown(_e: MouseEvent): void {
		handleStart();
	}

	function handleMouseMove(e: MouseEvent): void {
		handleMove(e.clientX);
	}

	function handleTouchStart(_e: TouchEvent): void {
		if (!autoplay) handleStart();
	}

	function handleTouchEnd(): void {
		if (!autoplay) handleEnd();
	}

	function handleTouchMove(e: TouchEvent): void {
		if (!autoplay) handleMove(e.touches[0].clientX);
	}

	// Watch for initialSliderPercentage changes
	$effect(() => {
		sliderXPercent = initialSliderPercentage;
	});

	// Watch for autoplay changes
	$effect(() => {
		if (autoplay && !isMouseOver && !isDragging) {
			startAutoplay();
		} else {
			stopAutoplay();
		}
	});

	onMount(() => {
		startAutoplay();
		return () => {
			stopAutoplay();
		};
	});
</script>

<div
	bind:this={sliderRef}
	class={cn('h-[400px] w-[400px] overflow-hidden', className)}
	style:position="relative"
	style:cursor={slideMode === 'drag' ? 'grab' : 'col-resize'}
	onmousemove={handleMouseMove}
	onmouseleave={mouseLeaveHandler}
	onmouseenter={mouseEnterHandler}
	onmousedown={handleMouseDown}
	onmouseup={handleEnd}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	ontouchmove={handleTouchMove}
	role="slider"
	aria-valuenow={sliderXPercent}
	aria-valuemin={0}
	aria-valuemax={100}
	tabindex="0"
>
	<!-- Slider Line -->
	<div
		class="pointer-events-none absolute top-0 z-40 m-auto h-full w-px bg-gradient-to-b from-transparent from-5% via-indigo-500 to-transparent to-95%"
		style:left="{sliderXPercent}%"
	>
		<!-- Decorative Effects -->
		<div
			class="absolute left-0 top-1/2 z-20 h-full w-36 -translate-y-1/2 bg-gradient-to-r from-indigo-400 via-transparent to-transparent opacity-50 [mask-image:radial-gradient(100px_at_left,white,transparent)]"
		></div>
		<div
			class="absolute left-0 top-1/2 z-10 h-1/2 w-10 -translate-y-1/2 bg-gradient-to-r from-cyan-400 via-transparent to-transparent opacity-100 [mask-image:radial-gradient(50px_at_left,white,transparent)]"
		></div>
		<div
			class="absolute -right-10 top-1/2 h-3/4 w-10 -translate-y-1/2 [mask-image:radial-gradient(100px_at_left,white,transparent)]"
		>
			<StarField starsCount={120} class="size-full" />
		</div>

		<!-- Custom Handle Slot -->
		{#if handle}
			{@render handle()}
		{:else if showHandlebar}
			<div
				class="pointer-events-auto absolute -right-2.5 top-1/2 z-30 flex size-5 -translate-y-1/2 cursor-grab items-center justify-center rounded-md bg-white shadow-[0px_-1px_0px_0px_#FFFFFF40]"
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
		{/if}
	</div>

	<!-- First Content -->
	<div class="relative z-20 size-full overflow-hidden" style:pointer-events={isInteracting ? 'none' : 'auto'}>
		<div
			class={cn(
				'absolute inset-0 z-20 h-full w-full flex-shrink-0 select-none overflow-hidden rounded-2xl',
				firstContentClass
			)}
			style:clip-path="inset(0 {100 - sliderXPercent}% 0 0)"
		>
			{#if firstContent}
				{@render firstContent()}
			{:else if firstImage}
				<img
					alt={firstImageAlt}
					src={firstImage}
					class={cn(
						'absolute inset-0 z-20 h-full w-full flex-shrink-0 select-none rounded-2xl object-cover',
						firstContentClass
					)}
					draggable="false"
				/>
			{/if}
		</div>
	</div>

	<!-- Second Content -->
	<div
		class={cn(
			'absolute left-0 top-0 z-[19] h-full w-full select-none rounded-2xl',
			secondContentClass
		)}
		style:pointer-events={isInteracting ? 'none' : 'auto'}
	>
		{#if secondContent}
			{@render secondContent()}
		{:else if secondImage}
			<img
				alt={secondImageAlt}
				src={secondImage}
				class={cn('h-full w-full object-cover', secondContentClass)}
				draggable="false"
			/>
		{/if}
	</div>
</div>
