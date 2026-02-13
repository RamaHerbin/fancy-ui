<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		starsCount?: number;
		class?: string;
	}

	let { starsCount = 130, class: className = '' }: Props = $props();

	interface StarData {
		top: string;
		left: string;
		targetTop: string;
		targetLeft: string;
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
	let stars: StarData[] = $derived(Array.from({ length: starsCount }, () => ({
		top: `calc(${random() * 100}% + ${randomMove()}px)`,
		left: `calc(${random() * 100}% + ${randomMove()}px)`,
		targetTop: `calc(${random() * 100}% + ${randomMove()}px)`,
		targetLeft: `calc(${random() * 100}% + ${randomMove()}px)`,
		opacity: random(),
		duration: random() * 10 + 20
	})));
</script>

<div class="absolute inset-0">
	{#each stars as star}
		<span
			class={cn(
				'inline-block absolute w-0.5 h-0.5 bg-white rounded-full z-[1] star-animate',
				className
			)}
			style="top:{star.top};left:{star.left};--target-top:{star.targetTop};--target-left:{star.targetLeft};--star-opacity:{star.opacity};animation-duration:{star.duration}s;"
		></span>
	{/each}
</div>

<style>
	:global {
		@keyframes star-drift {
			0% {
				opacity: 0;
				transform: scale(1);
			}
			50% {
				opacity: var(--star-opacity, 0.5);
				transform: scale(1.2);
			}
			100% {
				opacity: 0;
				transform: scale(0);
				top: var(--target-top);
				left: var(--target-left);
			}
		}
	}

	.star-animate {
		animation: star-drift linear infinite;
	}
</style>
