<!--
  Adapter for ShimmerButton.
  ShimmerButton uses a `children` snippet for content.
  The builder uses a `text` prop instead.
-->
<script lang="ts">
	import { ShimmerButton } from '$lib/fancy-ui/shimmer-button/index.js';

	interface Props {
		text?: string;
		shimmerColor?: string;
		shimmerSize?: string;
		borderRadius?: string;
		shimmerDuration?: string;
		background?: string;
		class?: string;
		[key: string]: unknown;
	}

	let {
		text = 'Click me',
		shimmerColor,
		shimmerSize,
		borderRadius,
		shimmerDuration,
		background,
		class: className,
		...restProps
	}: Props = $props();
</script>

<ShimmerButton {shimmerColor} {shimmerSize} {borderRadius} {shimmerDuration} {background} class={className} {...restProps}>
	<span class="relative z-10 whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg dark:from-white dark:to-slate-900/10">
		{text}
	</span>
</ShimmerButton>
