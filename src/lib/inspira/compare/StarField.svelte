<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		starsCount?: number;
		class?: string;
	}

	let { starsCount = 130, class: className = '' }: Props = $props();

	interface Star {
		id: number;
		top: string;
		left: string;
		size: number;
		twinkleDuration: number;
		driftDuration: number;
		driftDirection: number;
		opacityStart: number;
		opacityEnd: number;
	}

	function random(min: number, max: number): number {
		return Math.random() * (max - min) + min;
	}

	function randomSize(): number {
		return Math.random() < 0.5 ? 1 : 2;
	}

	// Generate stars once on component creation
	const stars: Star[] = Array.from({ length: starsCount }, (_, i): Star => ({
		id: i,
		top: `${random(0, 100)}%`,
		left: `${random(0, 100)}%`,
		size: randomSize(),
		twinkleDuration: random(2, 4),
		driftDuration: random(5, 10),
		driftDirection: random(-50, 50),
		opacityStart: random(0.1, 0.3),
		opacityEnd: random(0.7, 1)
	}));
</script>

<div class={cn('absolute inset-0 overflow-hidden', className)}>
	{#each stars as star (star.id)}
		<div
			class="star absolute rounded-full bg-white"
			style:top={star.top}
			style:left={star.left}
			style:width="{star.size}px"
			style:height="{star.size}px"
			style:--inspira-twinkle-duration="{star.twinkleDuration}s"
			style:--inspira-drift-duration="{star.driftDuration}s"
			style:--inspira-drift-direction="{star.driftDirection}px"
			style:--inspira-opacity-start={star.opacityStart}
			style:--inspira-opacity-end={star.opacityEnd}
		></div>
	{/each}
</div>

<style>
	.star {
		opacity: var(--inspira-opacity-start);
		animation:
			twinkle var(--inspira-twinkle-duration) ease-in-out infinite alternate,
			drift var(--inspira-drift-duration) linear infinite;
	}

	@keyframes twinkle {
		0% {
			opacity: var(--inspira-opacity-start);
		}
		100% {
			opacity: var(--inspira-opacity-end);
		}
	}

	@keyframes drift {
		0% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(var(--inspira-drift-direction), calc(var(--inspira-drift-direction) / 2));
		}
		50% {
			transform: translate(
				calc(var(--inspira-drift-direction) / 2),
				var(--inspira-drift-direction)
			);
		}
		75% {
			transform: translate(
				calc(var(--inspira-drift-direction) * -1),
				calc(var(--inspira-drift-direction) / 2)
			);
		}
		100% {
			transform: translate(0, 0);
		}
	}
</style>
