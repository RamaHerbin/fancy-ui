<!--
  Adapter for BlurReveal.
  BlurReveal uses a `children` snippet for content.
  The builder uses a `text` prop instead.
-->
<script lang="ts">
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal/index.js";

	interface Props {
		text?: string;
		duration?: number;
		delay?: number;
		blur?: string;
		yOffset?: number;
		class?: string;
		[key: string]: unknown;
	}

	let {
		text = "Blur Reveal Text",
		duration,
		delay,
		blur: blurAmount,
		yOffset,
		class: className,
		...restProps
	}: Props = $props();
</script>

<BlurReveal {duration} {delay} blur={blurAmount} {yOffset} class={className} {...restProps}>
	<p class="text-2xl font-semibold">{text}</p>
</BlurReveal>
