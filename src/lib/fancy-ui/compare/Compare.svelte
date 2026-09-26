<script lang="ts" module>
	/**
	 * Compare - a before/after slider split by a blade of light
	 *
	 * The seam is a beam: a white-hot core with a chromatic fringe, a glow
	 * that spills onto both sides, and pulses of light running along it. Moving
	 * the seam leaves a trail behind it that stretches with the speed of the
	 * gesture and settles when it stops.
	 */
	export const COMPARE_BEAM_COLORS = ["#22d3ee", "#818cf8", "#f472b6"];

	/** Three colours for the beam (left fringe, centre, right fringe), from one to many given. */
	export function beamPalette(colors: string[] | undefined): [string, string, string] {
		const list = (colors ?? []).filter(Boolean);
		if (list.length === 0) return COMPARE_BEAM_COLORS as [string, string, string];
		if (list.length === 1) return [list[0], list[0], list[0]];
		if (list.length === 2) return [list[0], `color-mix(in srgb, ${list[0]}, ${list[1]})`, list[1]];
		return [list[0], list[Math.floor((list.length - 1) / 2)], list[list.length - 1]];
	}

	/**
	 * One frame of the beam's motion: the trail follows the seam's velocity
	 * (px per frame, signed) and decays; the energy eases toward its target
	 * and is kicked up by speed.
	 */
	export function beamStep(
		trail: number,
		energy: number,
		deltaPx: number,
		target: number
	): { trail: number; energy: number } {
		const nextTrail = Math.max(-140, Math.min(140, trail * 0.86 + deltaPx * 1.6));
		const kick = Math.min(1, Math.abs(deltaPx) / 12);
		const nextEnergy = Math.min(1, energy + (Math.max(target, kick) - energy) * 0.12);
		return { trail: Math.abs(nextTrail) < 0.25 ? 0 : nextTrail, energy: nextEnergy };
	}

	/** Keyboard step for the slider, in %: arrows move 2, Shift+arrows 10, Home/End jump to the ends. */
	export function keyStep(key: string, shift: boolean, current: number): number | null {
		const step = shift ? 10 : 2;
		switch (key) {
			case "ArrowLeft":
			case "ArrowDown":
				return Math.max(0, current - step);
			case "ArrowRight":
			case "ArrowUp":
				return Math.min(100, current + step);
			case "PageDown":
				return Math.max(0, current - 10);
			case "PageUp":
				return Math.min(100, current + 10);
			case "Home":
				return 0;
			case "End":
				return 100;
			default:
				return null;
		}
	}
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";

	interface Props {
		firstImage?: string;
		secondImage?: string;
		firstImageAlt?: string;
		secondImageAlt?: string;
		class?: string;
		firstContentClass?: string;
		secondContentClass?: string;
		initialSliderPercentage?: number;
		slideMode?: "hover" | "drag";
		showHandlebar?: boolean;
		autoplay?: boolean;
		autoplayDuration?: number;
		/** Beam colours: left fringe, centre, right fringe (one or more colours) */
		beamColors?: string[];
		/** Accessible name of the slider */
		label?: string;
		onpercentagechange?: (percentage: number) => void;
		ondragstart?: () => void;
		ondragend?: () => void;
		onhoverenter?: () => void;
		onhoverleave?: () => void;
		firstContent?: import("svelte").Snippet;
		secondContent?: import("svelte").Snippet;
		handle?: import("svelte").Snippet;
	}

	let {
		firstImage = "",
		secondImage = "",
		firstImageAlt = "First image",
		secondImageAlt = "Second image",
		class: className = "",
		firstContentClass = "",
		secondContentClass = "",
		initialSliderPercentage = 50,
		slideMode = "hover",
		showHandlebar = true,
		autoplay = false,
		autoplayDuration = 5000,
		beamColors,
		label = "Comparison slider",
		onpercentagechange,
		ondragstart,
		ondragend,
		onhoverenter,
		onhoverleave,
		firstContent,
		secondContent,
		handle,
	}: Props = $props();

	const reducedMotion = createReducedMotion();
	$effect(() => reducedMotion.start());

	let sliderRef: HTMLDivElement;
	let sliderXPercent = $state(untrack(() => initialSliderPercentage));
	let isDragging = $state(false);
	let isMouseOver = $state(false);
	let isInteracting = $state(false);
	let autoplayRAF: number | null = null;
	let returnRAF: number | null = null;

	// the beam's motion: trail (px, signed) and energy (0 idle … 1 lit)
	let trail = $state(0);
	let energy = $state(0);
	let beamRAF: number | null = null;
	let lastPx: number | null = null;

	const palette = $derived(beamPalette(beamColors));

	function setPercent(p: number): void {
		const next = Math.max(0, Math.min(100, p));
		sliderXPercent = next;
		onpercentagechange?.(next);
	}

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
			// eased back-and-forth: slow at the ends, quick through the middle
			const linear = progress <= 1 ? progress : 2 - progress;
			const eased = linear < 0.5 ? 4 * linear ** 3 : 1 - (-2 * linear + 2) ** 3 / 2;

			setPercent(eased * 100);
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

	function stopReturn(): void {
		if (returnRAF) {
			cancelAnimationFrame(returnRAF);
			returnRAF = null;
		}
	}

	/** Glide the seam back to its resting place instead of snapping. */
	function glideTo(target: number): void {
		stopReturn();
		if (reducedMotion.current) {
			setPercent(target);
			return;
		}
		const from = sliderXPercent;
		const start = performance.now();
		const duration = 520;
		const step = (now: number) => {
			const k = Math.min(1, (now - start) / duration);
			const e = 1 - (1 - k) ** 3;
			setPercent(from + (target - from) * e);
			returnRAF = k < 1 ? requestAnimationFrame(step) : null;
		};
		returnRAF = requestAnimationFrame(step);
	}

	function mouseEnterHandler(): void {
		isMouseOver = true;
		stopReturn();
		onhoverenter?.();
		if (autoplay) {
			stopAutoplay();
		}
	}

	function mouseLeaveHandler(): void {
		isMouseOver = false;
		isInteracting = false;
		onhoverleave?.();

		if (slideMode === "hover") {
			glideTo(initialSliderPercentage);
		}
		if (slideMode === "drag") {
			isDragging = false;
		}

		if (autoplay) {
			stopReturn();
			startAutoplay();
		}
	}

	function handleStart(): void {
		if (slideMode === "drag") {
			isDragging = true;
			isInteracting = true;
			ondragstart?.();
			stopAutoplay();
		}
	}

	function handleEnd(): void {
		if (slideMode === "drag") {
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

		if (slideMode === "hover" || (slideMode === "drag" && isDragging)) {
			isInteracting = true;
			stopAutoplay();
			stopReturn();

			const rect = sliderRef.getBoundingClientRect();
			const x = clientX - rect.left;
			const percent = (x / rect.width) * 100;

			requestAnimationFrame(() => setPercent(percent));
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
		if (!autoplay) handleMove(e.touches[0].clientX);
	}

	function handleKeydown(e: KeyboardEvent): void {
		const next = keyStep(e.key, e.shiftKey, sliderXPercent);
		if (next === null) return;
		e.preventDefault();
		stopAutoplay();
		stopReturn();
		setPercent(next);
	}

	/** Run the beam's motion until it has settled. */
	function wakeBeam(): void {
		if (beamRAF !== null || reducedMotion.current) return;
		const tick = () => {
			const width = sliderRef?.clientWidth ?? 0;
			const px = (sliderXPercent / 100) * width;
			const delta = lastPx === null ? 0 : px - lastPx;
			lastPx = px;
			const target = isInteracting || isDragging ? 1 : isMouseOver ? 0.7 : 0;
			const next = beamStep(trail, energy, delta, target);
			trail = next.trail;
			energy = next.energy;
			const settled = trail === 0 && delta === 0 && Math.abs(energy - target) < 0.01;
			beamRAF = settled ? null : requestAnimationFrame(tick);
		};
		beamRAF = requestAnimationFrame(tick);
	}

	// any movement of the seam (pointer, keys, autoplay, glide) wakes the beam
	$effect(() => {
		void sliderXPercent;
		void isInteracting;
		void isMouseOver;
		untrack(wakeBeam);
	});

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
			stopReturn();
			if (beamRAF !== null) cancelAnimationFrame(beamRAF);
		};
	});
</script>

<div
	bind:this={sliderRef}
	class={cn("compare h-[400px] w-[400px] overflow-hidden", className)}
	style:position="relative"
	style:cursor={slideMode === "drag" ? (isDragging ? "grabbing" : "grab") : "col-resize"}
	style:--cmp-c1={palette[0]}
	style:--cmp-c2={palette[1]}
	style:--cmp-c3={palette[2]}
	style:--cmp-energy={energy.toFixed(3)}
	style:--cmp-trail={trail.toFixed(1)}
	data-active={isInteracting || isDragging ? "" : undefined}
	onmousemove={handleMouseMove}
	onmouseleave={mouseLeaveHandler}
	onmouseenter={mouseEnterHandler}
	onmousedown={handleMouseDown}
	onmouseup={handleEnd}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	ontouchmove={handleTouchMove}
	onkeydown={handleKeydown}
	role="slider"
	aria-label={label}
	aria-valuenow={Math.round(sliderXPercent)}
	aria-valuetext="{Math.round(sliderXPercent)}% {firstImageAlt}"
	aria-valuemin={0}
	aria-valuemax={100}
	aria-orientation="horizontal"
	tabindex="0"
>
	<!-- The seam: a blade of light, screened onto both sides -->
	<div
		class="compare-beam pointer-events-none absolute top-0 z-40 h-full w-px"
		style:left="{sliderXPercent}%"
		aria-hidden="true"
	>
		<span class="compare-beam__glow"></span>
		<span class="compare-beam__trail"></span>
		<span class="compare-beam__fringe"></span>
		<span class="compare-beam__core"></span>
		<span class="compare-beam__pulse"></span>
		<span class="compare-beam__pulse compare-beam__pulse--late"></span>
	</div>

	<!-- Handle, above the beam and not blended with it -->
	<div
		class="compare-seam pointer-events-none absolute top-0 z-[41] h-full w-px"
		style:left="{sliderXPercent}%"
	>
		{#if handle}
			{@render handle()}
		{:else if showHandlebar}
			<div class="compare-handle pointer-events-auto" aria-hidden="true">
				<span class="compare-handle__ring"></span>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 7 4 12l5 5M15 7l5 5-5 5" />
				</svg>
			</div>
		{/if}
	</div>

	<!-- First Content -->
	<div
		class="relative z-20 size-full overflow-hidden"
		style:pointer-events={isInteracting ? "none" : "auto"}
	>
		<div
			class={cn(
				"absolute inset-0 z-20 h-full w-full flex-shrink-0 overflow-hidden rounded-2xl select-none",
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
						"absolute inset-0 z-20 h-full w-full flex-shrink-0 rounded-2xl object-cover select-none",
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
			"absolute top-0 left-0 z-[19] h-full w-full overflow-hidden rounded-2xl select-none",
			secondContentClass
		)}
		style:pointer-events={isInteracting ? "none" : "auto"}
	>
		{#if secondContent}
			{@render secondContent()}
		{:else if secondImage}
			<img
				alt={secondImageAlt}
				src={secondImage}
				class={cn("h-full w-full object-cover", secondContentClass)}
				draggable="false"
			/>
		{/if}
	</div>
</div>

<style>
	@property --cmp-angle {
		syntax: "<angle>";
		inherits: false;
		initial-value: 0deg;
	}

	.compare:focus-visible {
		outline: 2px solid var(--cmp-c2);
		outline-offset: 3px;
	}

	/* the whole beam screens onto the pictures: light adds, never darkens */
	.compare-beam {
		mix-blend-mode: screen;
	}

	.compare-beam > span {
		position: absolute;
		pointer-events: none;
	}

	/* The light the beam spills on both sides: chromatic, brighter when active. */
	.compare-beam__glow {
		top: 0;
		bottom: 0;
		left: -70px;
		width: 140px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--cmp-c1) 55%, transparent) 38%,
			var(--cmp-c2) 50%,
			color-mix(in srgb, var(--cmp-c3) 55%, transparent) 62%,
			transparent
		);
		-webkit-mask: linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent);
		mask: linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent);
		filter: blur(18px);
		opacity: calc(0.35 + var(--cmp-energy) * 0.55);
	}

	/* The trail: stretched out behind the seam by its speed (the sign picks the side). */
	.compare-beam__trail {
		top: 12%;
		bottom: 12%;
		left: 0;
		width: 100px;
		transform-origin: left center;
		transform: scaleX(calc(var(--cmp-trail) / -100));
		background: linear-gradient(
			to right,
			#fff,
			var(--cmp-c2) 18%,
			color-mix(in srgb, var(--cmp-c3) 50%, transparent) 55%,
			transparent
		);
		-webkit-mask: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);
		mask: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);
		filter: blur(6px);
		opacity: 0.75;
	}

	/* A chromatic fringe either side of the core. */
	.compare-beam__fringe {
		top: 0;
		bottom: 0;
		left: -4px;
		width: 9px;
		background: linear-gradient(
			to right,
			var(--cmp-c1),
			transparent 45%,
			transparent 55%,
			var(--cmp-c3)
		);
		-webkit-mask: linear-gradient(to bottom, transparent, #000 8%, #000 92%, transparent);
		mask: linear-gradient(to bottom, transparent, #000 8%, #000 92%, transparent);
		filter: blur(1.5px);
		opacity: calc(0.55 + var(--cmp-energy) * 0.45);
	}

	/* The white-hot core. */
	.compare-beam__core {
		top: 0;
		bottom: 0;
		left: -0.75px;
		width: 1.5px;
		background: linear-gradient(
			to bottom,
			transparent,
			color-mix(in srgb, var(--cmp-c2) 40%, #fff) 6%,
			#fff 30%,
			#fff 70%,
			color-mix(in srgb, var(--cmp-c2) 40%, #fff) 94%,
			transparent
		);
		box-shadow: 0 0 6px 0.5px color-mix(in srgb, var(--cmp-c2) 80%, transparent);
	}

	/* Pulses of light running down the seam. */
	.compare-beam__pulse {
		top: 0;
		left: -1.5px;
		width: 3px;
		height: 26%;
		border-radius: 999px;
		background: linear-gradient(to bottom, transparent, #fff 50%, transparent);
		filter: drop-shadow(0 0 4px var(--cmp-c2)) drop-shadow(0 0 10px var(--cmp-c1));
		opacity: 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.compare-beam__pulse {
			animation: cmp-pulse 3.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
		}
		.compare-beam__pulse--late {
			animation-delay: -1.6s;
			animation-duration: 3.2s;
		}
		.compare[data-active] .compare-beam__pulse {
			animation-duration: 1.6s;
		}
		.compare[data-active] .compare-beam__pulse--late {
			animation-delay: -0.8s;
		}
		.compare-handle__ring {
			animation: cmp-spin 4s linear infinite;
		}
		.compare[data-active] .compare-handle__ring {
			animation-duration: 1.4s;
		}
	}

	@keyframes cmp-pulse {
		0% {
			transform: translateY(-100%);
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		85% {
			opacity: 1;
		}
		100% {
			transform: translateY(385%);
			opacity: 0;
		}
	}

	/* The handle: a glass bead on the beam with a ring of light round it. */
	.compare-handle {
		position: absolute;
		top: 50%;
		left: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 999px;
		transform: translate(-50%, -50%) scale(calc(1 + var(--cmp-energy) * 0.08));
		color: #fff;
		background: rgb(255 255 255 / 0.12);
		backdrop-filter: blur(10px) saturate(1.4);
		-webkit-backdrop-filter: blur(10px) saturate(1.4);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.35),
			inset 0 0 0 1px rgb(255 255 255 / 0.18),
			0 4px 16px rgb(0 0 0 / 0.35),
			0 0 calc(8px + var(--cmp-energy) * 18px) color-mix(in srgb, var(--cmp-c2) 70%, transparent);
		cursor: inherit;
	}

	.compare-handle svg {
		filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.45));
	}

	.compare-handle__ring {
		position: absolute;
		inset: -1.5px;
		border-radius: inherit;
		padding: 1.5px;
		background: conic-gradient(
			from var(--cmp-angle),
			transparent 0%,
			var(--cmp-c1) 18%,
			#fff 30%,
			var(--cmp-c3) 42%,
			transparent 58%,
			transparent 100%
		);
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
		opacity: calc(0.45 + var(--cmp-energy) * 0.55);
	}

	@keyframes cmp-spin {
		to {
			--cmp-angle: 360deg;
		}
	}
</style>
