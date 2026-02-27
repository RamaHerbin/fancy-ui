<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = "", children }: Props = $props();

	let tracingBeamRef: HTMLDivElement;
	let contentRef: HTMLDivElement;
	let svgHeight = $state(0);
	let scrollYProgress = $state(0);
	let scrollPercentage = $state(0);

	// Spring state
	let springY1 = $state(0);
	let springY2 = $state(0);
	let springVelY1 = 0;
	let springVelY2 = 0;

	let targetY1 = $derived(
		mapRange(scrollYProgress, 0, 0.8, scrollYProgress, svgHeight) * (1.4 - scrollPercentage)
	);

	let targetY2 = $derived(
		mapRange(scrollYProgress, 0, 1, scrollYProgress, svgHeight - 500) * (1.4 - scrollPercentage)
	);

	let circleHasShadow = $derived(scrollYProgress <= 0);
	let circleBg = $derived(scrollYProgress > 0 ? "bg-white" : "bg-emerald-500");
	let circleBorder = $derived(scrollYProgress > 0 ? "border-neutral-300" : "border-emerald-600");

	let svgPath = $derived(`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`);

	let rafId: number;

	function mapRange(
		value: number,
		inMin: number,
		inMax: number,
		outMin: number,
		outMax: number
	): number {
		return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
	}

	function updateSpring() {
		const tension = 80;
		const friction = 26;
		const precision = 0.01;

		const forceY1 = tension * (targetY1 - springY1);
		springVelY1 = (springVelY1 + forceY1 * 0.001) * (1 - friction * 0.001);
		springY1 += springVelY1;

		const forceY2 = tension * (targetY2 - springY2);
		springVelY2 = (springVelY2 + forceY2 * 0.001) * (1 - friction * 0.001);
		springY2 += springVelY2;

		const settled =
			Math.abs(springVelY1) < precision &&
			Math.abs(targetY1 - springY1) < precision &&
			Math.abs(springVelY2) < precision &&
			Math.abs(targetY2 - springY2) < precision;

		if (!settled) {
			rafId = requestAnimationFrame(updateSpring);
		}
	}

	function updateScrollProgress() {
		if (!tracingBeamRef) return;
		const rect = tracingBeamRef.getBoundingClientRect();
		const windowHeight = window.innerHeight;
		const elementHeight = rect.height;

		scrollPercentage = (windowHeight - rect.top) / (windowHeight + elementHeight);
		scrollYProgress = (rect.y / windowHeight) * -1;

		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(updateSpring);
	}

	function updateSVGHeight() {
		if (!contentRef) return;
		svgHeight = contentRef.offsetHeight;
	}

	onMount(() => {
		window.addEventListener("scroll", updateScrollProgress, { passive: true });
		window.addEventListener("resize", updateScrollProgress, { passive: true });
		updateScrollProgress();

		const resizeObserver = new ResizeObserver(updateSVGHeight);
		resizeObserver.observe(contentRef);
		updateSVGHeight();

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener("scroll", updateScrollProgress);
			window.removeEventListener("resize", updateScrollProgress);
			resizeObserver.disconnect();
		};
	});
</script>

<div bind:this={tracingBeamRef} class={cn("relative mx-auto h-full w-full max-w-4xl", className)}>
	<div class="absolute top-3 -left-4 md:-left-12">
		<div
			class="ml-[27px] flex size-4 items-center justify-center rounded-full border border-neutral-200 shadow-sm"
			style:box-shadow={circleHasShadow ? "rgba(0, 0, 0, 0.24) 0px 3px 8px" : "none"}
		>
			<div class={cn("size-2 rounded-full border", circleBg, circleBorder)}></div>
		</div>
		<svg
			viewBox="0 0 20 {svgHeight}"
			width="20"
			height={svgHeight}
			class="ml-4 block"
			aria-hidden="true"
		>
			<path d={svgPath} fill="none" stroke="#9091A0" stroke-opacity="0.16"></path>
			<path
				d={svgPath}
				fill="none"
				stroke="url(#tracing-beam-gradient)"
				stroke-width="1.25"
				class="motion-reduce:hidden"
			></path>
			<defs>
				<linearGradient
					id="tracing-beam-gradient"
					gradientUnits="userSpaceOnUse"
					x1="0"
					x2="0"
					y1={springY1}
					y2={springY2}
				>
					<stop stop-color="#18CCFC" stop-opacity="0"></stop>
					<stop stop-color="#18CCFC"></stop>
					<stop offset="0.325" stop-color="#6344F5"></stop>
					<stop offset="1" stop-color="#AE48FF" stop-opacity="0"></stop>
				</linearGradient>
			</defs>
		</svg>
	</div>
	<div bind:this={contentRef}>
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
