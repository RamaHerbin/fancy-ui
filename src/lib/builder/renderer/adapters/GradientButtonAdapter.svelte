<!--
  Adapter for GradientButton.
  GradientButton uses a `children` snippet for content.
  The builder uses a `text` prop instead.
-->
<script lang="ts">
	import { GradientButton } from "$lib/fancy-ui/gradient-button/index.js";

	interface Props {
		text?: string;
		duration?: number;
		borderWidth?: number;
		borderRadius?: number;
		blur?: number;
		bgColor?: string;
		class?: string;
		[key: string]: unknown;
	}

	let {
		text = "Gradient Button",
		duration,
		borderWidth,
		borderRadius,
		blur,
		bgColor,
		class: className,
		...restProps
	}: Props = $props();
</script>

<GradientButton
	{duration}
	{borderWidth}
	{borderRadius}
	{blur}
	{bgColor}
	class={className}
	{...restProps}
>
	<span class="relative z-10 text-sm font-medium text-white">
		{text}
	</span>
</GradientButton>
