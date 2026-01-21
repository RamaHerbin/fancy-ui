<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { cn } from '$lib/utils';
	import type { AnimatedBeamProps } from './types';

	let {
		class: className = '',
		containerRef,
		fromRef,
		toRef,
		curvature = 0,
		reverse = false,
		pathColor = 'gray',
		pathWidth = 2,
		pathOpacity = 0.2,
		gradientStartColor = '#FFAA40',
		gradientStopColor = '#9C40FF',
		delay = 0,
		duration = Math.random() * 3 + 4,
		startXOffset = 0,
		startYOffset = 0,
		endXOffset = 0,
		endYOffset = 0
	}: AnimatedBeamProps = $props();

	// Generate unique ID for gradient
	const id = 'beam-' + Math.random().toString(36).substring(2, 10);

	// Reactive state
	let isVertical = $state(false);
	let isRightToLeft = $state(false);
	let isBottomToTop = $state(false);
	let pathD = $state('');
	let svgDimensions = $state<{ width: number; height: number }>({
		width: 0,
		height: 0
	});

	// Derived values for animation
	let x1 = $derived(() => {
		const direction = reverse ? !isRightToLeft : isRightToLeft;
		return direction ? '90%; -10%;' : '10%; 110%;';
	});

	let x2 = $derived(() => {
		const direction = reverse ? !isRightToLeft : isRightToLeft;
		return direction ? '100%; 0%;' : '0%; 100%;';
	});

	let y1 = $derived(() => {
		const direction = reverse ? !isBottomToTop : isBottomToTop;
		return direction ? '90%; -10%;' : '10%; 110%;';
	});

	let y2 = $derived(() => {
		const direction = reverse ? !isBottomToTop : isBottomToTop;
		return direction ? '100%; 0%;' : '0%; 100%;';
	});

	let resizeObserver: ResizeObserver | undefined = undefined;

	// Function to update the path based on the positions of the elements
	function updatePath() {
		if (containerRef && fromRef && toRef) {
			const containerRect = containerRef.getBoundingClientRect();
			const rectA = fromRef.getBoundingClientRect();
			const rectB = toRef.getBoundingClientRect();

			const svgWidth = containerRect.width;
			const svgHeight = containerRect.height;
			svgDimensions = { width: svgWidth, height: svgHeight };

			const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
			const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
			const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
			const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;

			// Check if the light beam is in a vertical direction
			isVertical = Math.abs(endY - startY) > Math.abs(endX - startX);

			// Determine the animation direction
			isRightToLeft = endX < startX;
			isBottomToTop = endY < startY;

			const controlY = startY - curvature;
			const d = `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`;
			pathD = d;
		}
	}

	// Setup ResizeObserver on mount
	onMount(() => {
		if (containerRef) {
			resizeObserver = new ResizeObserver(() => {
				updatePath();
			});
			resizeObserver.observe(containerRef);

			// Initial path calculation
			updatePath();
		}

		return () => {
			resizeObserver?.disconnect();
		};
	});

	// Cleanup on destroy
	onDestroy(() => {
		resizeObserver?.disconnect();
	});
</script>

<svg
	fill="none"
	width={svgDimensions.width}
	height={svgDimensions.height}
	xmlns="http://www.w3.org/2000/svg"
	class={cn('pointer-events-none absolute left-0 top-0 transform-gpu stroke-2', className)}
	viewBox="0 0 {svgDimensions.width} {svgDimensions.height}"
>
	<path
		d={pathD}
		stroke={pathColor}
		stroke-width={pathWidth}
		stroke-opacity={pathOpacity}
		stroke-linecap="round"
	/>
	<path
		d={pathD}
		stroke-width={pathWidth}
		stroke="url(#{id})"
		stroke-opacity="1"
		stroke-linecap="round"
	/>
	<defs>
		<linearGradient {id} gradientUnits="userSpaceOnUse" x1="0%" x2="0%" y1="0%" y2="0%">
			<stop stop-color={gradientStartColor} stop-opacity="0" />
			<stop stop-color={gradientStartColor} />
			<stop offset="32.5%" stop-color={gradientStopColor} />
			<stop offset="100%" stop-color={gradientStopColor} stop-opacity="0" />
			{#if !isVertical}
				<animate
					attributeName="x1"
					values={x1()}
					dur="{duration}s"
					keyTimes="0; 1"
					keySplines="0.16 1 0.3 1"
					calcMode="spline"
					repeatCount="indefinite"
				/>
				<animate
					attributeName="x2"
					values={x2()}
					dur="{duration}s"
					keyTimes="0; 1"
					keySplines="0.16 1 0.3 1"
					calcMode="spline"
					repeatCount="indefinite"
				/>
			{:else}
				<animate
					attributeName="y1"
					values={y1()}
					dur="{duration}s"
					keyTimes="0; 1"
					keySplines="0.16 1 0.3 1"
					calcMode="spline"
					repeatCount="indefinite"
				/>
				<animate
					attributeName="y2"
					values={y2()}
					dur="{duration}s"
					keyTimes="0; 1"
					keySplines="0.16 1 0.3 1"
					calcMode="spline"
					repeatCount="indefinite"
				/>
			{/if}
		</linearGradient>
	</defs>
</svg>
