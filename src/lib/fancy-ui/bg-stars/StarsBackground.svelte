<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount, untrack } from "svelte";
	import { createBgStars, generateStars, type BgStarsEngine } from "./bg-stars-core.js";

	interface Props {
		/**
		 * Parallax factor for mouse movement (default: 0.05)
		 */
		factor?: number;
		/**
		 * Base animation speed in seconds (default: 50)
		 */
		speed?: number;
		/**
		 * Spring stiffness for parallax (default: 50)
		 */
		stiffness?: number;
		/**
		 * Spring damping for parallax (default: 20)
		 */
		damping?: number;
		/**
		 * Color of the stars (default: #fff)
		 */
		starColor?: string;
		/**
		 * Additional CSS classes
		 */
		class?: string;
		/**
		 * Child content to render over the stars
		 */
		children?: import("svelte").Snippet;
	}

	let {
		factor = 0.05,
		speed = 50,
		stiffness = 50,
		damping = 20,
		starColor = "#fff",
		class: className,
		children,
	}: Props = $props();

	let hostEl: HTMLDivElement;
	let parallaxEl: HTMLDivElement;
	let engine: BgStarsEngine | null = null;

	// Star box-shadows (generated on mount, regenerated when starColor changes)
	let boxShadow1 = $state("");
	let boxShadow2 = $state("");
	let boxShadow3 = $state("");

	$effect(() => {
		const color = starColor;
		boxShadow1 = generateStars(1000, color);
		boxShadow2 = generateStars(400, color);
		boxShadow3 = generateStars(200, color);
	});

	onMount(() => {
		engine = createBgStars(
			{ host: hostEl, parallax: parallaxEl },
			{ factor, stiffness, damping },
		);

		return () => {
			engine?.destroy();
			engine = null;
		};
	});

	$effect(() => {
		const next = { factor, stiffness, damping };
		untrack(() => engine?.setOptions(next));
	});

	// Derived CSS custom properties for animation durations
	let layer1Duration = $derived(`${speed}s`);
	let layer2Duration = $derived(`${speed * 2}s`);
	let layer3Duration = $derived(`${speed * 3}s`);
</script>

<div
	bind:this={hostEl}
	class={cn(
		"relative size-full overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)]",
		className
	)}
>
	<div bind:this={parallaxEl} class="stars-parallax">
		<!-- Star Layer 1 (smallest, fastest) -->
		<div class="star-layer" style:--duration={layer1Duration}>
			<div
				class="star-field"
				style:width="1px"
				style:height="1px"
				style:box-shadow={boxShadow1}
			></div>
			<div
				class="star-field top-[2000px]"
				style:width="1px"
				style:height="1px"
				style:box-shadow={boxShadow1}
			></div>
		</div>

		<!-- Star Layer 2 (medium) -->
		<div class="star-layer" style:--duration={layer2Duration}>
			<div
				class="star-field"
				style:width="2px"
				style:height="2px"
				style:box-shadow={boxShadow2}
			></div>
			<div
				class="star-field top-[2000px]"
				style:width="2px"
				style:height="2px"
				style:box-shadow={boxShadow2}
			></div>
		</div>

		<!-- Star Layer 3 (largest, slowest) -->
		<div class="star-layer" style:--duration={layer3Duration}>
			<div
				class="star-field"
				style:width="3px"
				style:height="3px"
				style:box-shadow={boxShadow3}
			></div>
			<div
				class="star-field top-[2000px]"
				style:width="3px"
				style:height="3px"
				style:box-shadow={boxShadow3}
			></div>
		</div>
	</div>

	<!-- Slot for child content -->
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.stars-parallax {
		will-change: transform;
	}

	.star-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 2000px;
		animation: scroll-stars var(--duration, 50s) linear infinite;
	}

	.star-field {
		position: absolute;
		background: transparent;
		border-radius: 50%;
	}

	@keyframes scroll-stars {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(-2000px);
		}
	}
</style>
