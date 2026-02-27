<script lang="ts" module>
	/**
	 * SparklesText - Text with animated sparkle stars
	 *
	 * Renders text with SVG sparkle stars overlaid that animate with
	 * fade/scale/rotation effects. Sparkles regenerate periodically.
	 */
	export interface SparklesTextProps {
		/** Text to display */
		text: string;
		/** Number of sparkle stars */
		sparklesCount?: number;
		/** Two colors for sparkle stars */
		colors?: { first: string; second: string };
		/** Additional CSS classes */
		class?: string;
	}

	interface Sparkle {
		id: string;
		x: string;
		y: string;
		color: string;
		delay: number;
		scale: number;
		lifespan: number;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";

	let {
		text,
		sparklesCount = 10,
		colors = { first: "#9E7AFF", second: "#FE8BBB" },
		class: className,
	}: SparklesTextProps = $props();

	let sparkles = $state<Sparkle[]>([]);

	function generateStar(): Sparkle {
		const x = `${Math.random() * 100}%`;
		const y = `${Math.random() * 100}%`;
		const color = Math.random() > 0.5 ? colors.first : colors.second;
		const delay = Math.random() * 2;
		const scale = Math.random() * 1 + 0.3;
		const lifespan = Math.random() * 10 + 5;
		const id = `${x}-${y}-${Date.now()}-${Math.random()}`;
		return { id, x, y, color, delay, scale, lifespan };
	}

	function initializeStars() {
		sparkles = Array.from({ length: sparklesCount }, generateStar);
	}

	function updateStars() {
		sparkles = sparkles.map((star) => {
			if (star.lifespan <= 0) {
				return generateStar();
			}
			return { ...star, lifespan: star.lifespan - 0.1 };
		});
	}

	initializeStars();

	onMount(() => {
		const intervalId = setInterval(updateStars, 100);
		return () => clearInterval(intervalId);
	});
</script>

<div class={cn("sparkles-text text-6xl font-bold", className)}>
	<span class="relative inline-block">
		{#each sparkles as sparkle (sparkle.id)}
			<svg
				class="sparkles-star pointer-events-none absolute z-20"
				style="left:{sparkle.x};top:{sparkle.y};--sparkle-scale:{sparkle.scale};animation:sparkleAnim 0.8s ease-in-out {sparkle.delay}s infinite;transform:scale(0) rotate(75deg);opacity:0"
				width="21"
				height="21"
				viewBox="0 0 21 21"
			>
				<path
					d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
					fill={sparkle.color}
				/>
			</svg>
		{/each}
		{text}
	</span>
</div>

<style>
	:global {
		@keyframes sparkleAnim {
			0% {
				opacity: 0;
				transform: scale(0) rotate(75deg);
			}
			50% {
				opacity: 1;
				transform: scale(var(--sparkle-scale, 1)) rotate(120deg);
			}
			100% {
				opacity: 0;
				transform: scale(0) rotate(150deg);
			}
		}
	}
</style>
