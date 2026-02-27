<script lang="ts" module>
	/**
	 * Meteors - Animated meteor shower effect
	 *
	 * Generates N span elements with randomized positions, delays, and durations
	 * that animate diagonally across the container.
	 */
	export interface MeteorsProps {
		/** Number of meteors to render */
		count?: number;
		/** Additional CSS classes applied to each meteor */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { count = 20, class: className }: MeteorsProps = $props();

	const meteors = $derived(
		Array.from({ length: count }, () => ({
			left: `${Math.floor(Math.random() * 800 - 400)}px`,
			animationDelay: `${(Math.random() * 0.6 + 0.2).toFixed(2)}s`,
			animationDuration: `${Math.floor(Math.random() * 8 + 2)}s`,
		}))
	);
</script>

{#each meteors as meteor, i (i)}
	<span
		class={cn(
			"meteor pointer-events-none absolute top-0 h-0.5 w-0.5 rounded-full bg-slate-500 opacity-0 shadow-[0_0_0_1px_#ffffff10]",
			"before:absolute before:top-1/2 before:h-px before:w-[50px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-slate-500 before:to-transparent before:content-['']",
			className
		)}
		style="left:{meteor.left};animation-delay:{meteor.animationDelay};animation-duration:{meteor.animationDuration}"
	></span>
{/each}

<style>
	@keyframes meteor-fall {
		0% {
			transform: rotate(215deg) translateX(0);
			opacity: 1;
		}
		70% {
			opacity: 1;
		}
		100% {
			transform: rotate(215deg) translateX(-500px);
			opacity: 0;
		}
	}

	.meteor {
		animation: meteor-fall 5s linear infinite;
	}
</style>
