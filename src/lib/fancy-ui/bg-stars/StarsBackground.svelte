<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount } from "svelte";

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

	// Star box-shadows (generated on mount)
	let boxShadow1 = $state("");
	let boxShadow2 = $state("");
	let boxShadow3 = $state("");

	// Spring animation state
	let springX = $state(0);
	let springY = $state(0);
	let targetX = 0;
	let targetY = 0;
	let velocityX = 0;
	let velocityY = 0;
	let animationFrame: number;

	function generateStars(count: number, color: string): string {
		const shadows: string[] = [];
		for (let i = 0; i < count; i++) {
			const x = Math.floor(Math.random() * 4000) - 2000;
			const y = Math.floor(Math.random() * 4000) - 2000;
			shadows.push(`${x}px ${y}px ${color}`);
		}
		return shadows.join(", ");
	}

	function handleMouseMove(e: MouseEvent) {
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;
		targetX = -(e.clientX - centerX) * factor;
		targetY = -(e.clientY - centerY) * factor;
	}

	function updateSpring() {
		// Simple spring physics
		const forceX = (targetX - springX) * (stiffness / 1000);
		const forceY = (targetY - springY) * (stiffness / 1000);

		velocityX = velocityX * (1 - damping / 100) + forceX;
		velocityY = velocityY * (1 - damping / 100) + forceY;

		springX += velocityX;
		springY += velocityY;

		animationFrame = requestAnimationFrame(updateSpring);
	}

	// Regenerate stars when color changes
	$effect(() => {
		boxShadow1 = generateStars(1000, starColor);
		boxShadow2 = generateStars(400, starColor);
		boxShadow3 = generateStars(200, starColor);
	});

	onMount(() => {
		// Start spring animation loop
		animationFrame = requestAnimationFrame(updateSpring);

		return () => {
			cancelAnimationFrame(animationFrame);
		};
	});

	// Derived CSS custom properties for animation durations
	let layer1Duration = $derived(`${speed}s`);
	let layer2Duration = $derived(`${speed * 2}s`);
	let layer3Duration = $derived(`${speed * 3}s`);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={cn(
		"relative size-full overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)]",
		className
	)}
	onmousemove={handleMouseMove}
>
	<div class="stars-parallax" style:transform="translate({springX}px, {springY}px)">
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
