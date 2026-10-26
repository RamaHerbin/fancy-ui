<script lang="ts">
	import { cn } from "$lib/utils.js";

	interface Props {
		starsCount?: number;
		class?: string;
	}

	let { starsCount = 130, class: className = "" }: Props = $props();

	interface StarData {
		top: string;
		left: string;
		driftX: string;
		driftY: string;
		opacity: number;
		duration: number;
	}

	function randomMove() {
		return Math.random() * 4 - 2;
	}

	function random() {
		return Math.random();
	}

	// Generate star data reactively based on starsCount
	let stars: StarData[] = $derived(
		Array.from({ length: starsCount }, () => {
			// Four position draws, kept in this order: start top/left, then the target.
			const topPct = random() * 100;
			const topMove = randomMove();
			const leftPct = random() * 100;
			const leftMove = randomMove();
			const targetTopPct = random() * 100;
			const targetTopMove = randomMove();
			const targetLeftPct = random() * 100;
			const targetLeftMove = randomMove();
			return {
				top: `calc(${topPct}% + ${topMove}px)`,
				left: `calc(${leftPct}% + ${leftMove}px)`,
				// The drift is a transform (compositor) rather than animated top/left.
				// Percent deltas resolve against the size-container wrapper below.
				driftX: `calc(${targetLeftPct - leftPct}cqw + ${targetLeftMove - leftMove}px)`,
				driftY: `calc(${targetTopPct - topPct}cqh + ${targetTopMove - topMove}px)`,
				opacity: random(),
				duration: random() * 10 + 20,
			};
		})
	);
</script>

<div class="absolute inset-0" style="container-type: size;">
	{#each stars as star}
		<span
			class={cn(
				"star-animate absolute z-[1] inline-block h-0.5 w-0.5 rounded-full bg-white",
				className
			)}
			style="top:{star.top};left:{star.left};--drift-x:{star.driftX};--drift-y:{star.driftY};--star-opacity:{star.opacity};animation-duration:{star.duration}s;"
		></span>
	{/each}
</div>

<style>
	:global {
		@keyframes star-drift {
			0% {
				opacity: 0;
				transform: translate(0, 0) scale(1);
			}
			50% {
				opacity: var(--star-opacity, 0.5);
				transform: translate(calc(var(--drift-x) / 2), calc(var(--drift-y) / 2)) scale(1.2);
			}
			100% {
				opacity: 0;
				transform: translate(var(--drift-x), var(--drift-y)) scale(0);
			}
		}
	}

	/* Resting state: a faint fixed star; the drift only runs without a reduce preference.
	   `animation-duration` stays inline and is inert without an animation name. */
	.star-animate {
		opacity: var(--star-opacity, 0.5);
	}

	@media (prefers-reduced-motion: no-preference) {
		.star-animate {
			opacity: 0;
			animation: star-drift linear infinite;
		}
	}
</style>
