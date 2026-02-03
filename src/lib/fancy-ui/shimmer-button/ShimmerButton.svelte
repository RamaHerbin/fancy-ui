<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type BaseProps = {
		/** Shimmer highlight color */
		shimmerColor?: string;
		/** Thickness of the shimmer border */
		shimmerSize?: string;
		/** Button border radius */
		borderRadius?: string;
		/** Duration of the shimmer animation cycle */
		shimmerDuration?: string;
		/** Button background color */
		background?: string;
		/** Custom CSS class */
		class?: string;
		/** Button content */
		children?: Snippet;
	};

	export type ShimmerButtonProps = BaseProps & Omit<HTMLButtonAttributes, keyof BaseProps>;
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		shimmerColor = '#ffffff',
		shimmerSize = '0.05em',
		borderRadius = '100px',
		shimmerDuration = '3s',
		background = 'rgba(0, 0, 0, 1)',
		children,
		...restProps
	}: ShimmerButtonProps = $props();

	const styleVars = $derived(
		`--spread: 90deg; --shimmer-color: ${shimmerColor}; --radius: ${borderRadius}; --speed: ${shimmerDuration}; --cut: ${shimmerSize}; --bg: ${background}`
	);
</script>

<button
	class={cn(
		'shimmer-button group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)] dark:text-black',
		'transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px',
		className
	)}
	style={styleVars}
	{...restProps}
>
	<!-- Shimmer layer -->
	<div class="-z-30 absolute inset-0 overflow-visible blur-[2px] [container-type:size]">
		<div class="shimmer-slide absolute inset-0 h-[100cqh] [aspect-ratio:1] [border-radius:0] [mask:none]">
			<div
				class="spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]"
			></div>
		</div>
	</div>

	<!-- Content -->
	{@render children?.()}

	<!-- Inner shadow overlay -->
	<div
		class={cn(
			'insert-0 absolute size-full',
			'rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]',
			'transform-gpu transition-all duration-300 ease-in-out',
			'group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]',
			'group-active:shadow-[inset_0_-10px_10px_#ffffff3f]'
		)}
	></div>

	<!-- Background fill -->
	<div class="absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]"></div>
</button>

<style>
	@keyframes shimmer-slide {
		to {
			transform: translate(calc(100cqw - 100%), 0);
		}
	}

	@keyframes spin-around {
		0% {
			transform: translateZ(0) rotate(0);
		}
		15%,
		35% {
			transform: translateZ(0) rotate(90deg);
		}
		65%,
		85% {
			transform: translateZ(0) rotate(270deg);
		}
		100% {
			transform: translateZ(0) rotate(360deg);
		}
	}

	.shimmer-slide {
		animation: shimmer-slide var(--speed) ease-in-out infinite alternate;
	}

	.spin-around {
		animation: spin-around calc(var(--speed) * 2) infinite linear;
	}
</style>
