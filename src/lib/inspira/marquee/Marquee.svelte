<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		class?: string;
		reverse?: boolean;
		pauseOnHover?: boolean;
		vertical?: boolean;
		repeat?: number;
		children?: import('svelte').Snippet;
	}

	let {
		class: className,
		reverse = false,
		pauseOnHover = false,
		vertical = false,
		repeat = 4,
		children
	}: Props = $props();
</script>

<div
	class={cn(
		'group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]',
		vertical ? 'flex-col' : 'flex-row',
		className
	)}
>
	{#each Array(repeat) as _, index (index)}
		<div
			class={cn(
				'flex shrink-0 justify-around [gap:var(--gap)]',
				vertical ? 'animate-marquee-vertical flex-col' : 'animate-marquee flex-row',
				pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''
			)}
			style="animation-direction: {reverse ? 'reverse' : 'normal'};"
		>
			{@render children?.()}
		</div>
	{/each}
</div>

<style>
	.animate-marquee {
		animation: marquee var(--duration) linear infinite;
	}

	.animate-marquee-vertical {
		animation: marquee-vertical var(--duration) linear infinite;
	}

	@keyframes marquee {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(calc(-100% - var(--gap)));
		}
	}

	@keyframes marquee-vertical {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(calc(-100% - var(--gap)));
		}
	}
</style>
